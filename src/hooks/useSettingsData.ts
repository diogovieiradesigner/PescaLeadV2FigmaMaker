import { useState, useEffect, useCallback, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

export interface Instance {
  id: string;
  workspace_id: string;
  name: string;
  provider: 'whatsapp' | 'instagram' | 'telegram' | 'evolution';
  phone_number: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  qr_code?: string;
  api_key?: string;
  webhook_url?: string;
  working_hours: {
    start: string;
    end: string;
  };
  settings?: Record<string, any>;
  last_connected_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Inbox {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  auto_assignment?: boolean;
  assigned_agents?: string[]; // List of user_ids stored in DB
  agents?: string[]; // Mapped for UI
  instances?: string[]; // Mapped for UI from relation
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceMember {
  user_id: string;
  workspace_id: string;
  role: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface InboxInstance {
  inbox_id: string;
  instance_id: string;
  created_at?: string;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774`;

export function useSettingsData(workspaceId: string | null) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || publicAnonKey}`,
    };
  };

  // Fetch instances
  const fetchInstances = useCallback(async () => {
    if (!workspaceId) return;

    try {
      // Switch to direct Supabase query for fetching instances (simpler and handles auth)
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) {
        throw error;
      }

      if (data) {
        setInstances(data as Instance[]);
      }
    } catch (err) {
      console.error('Error fetching instances:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [workspaceId]);

  // Fetch inboxes
  const fetchInboxes = useCallback(async () => {
    if (!workspaceId) return;

    try {
      // Fetch inboxes and their relations directly from Supabase for better join support
      const { data, error } = await supabase
        .from('inboxes')
        .select(`
          *,
          inbox_instances (
            instance_id
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) {
        throw error;
      }

      if (data) {
        const mappedInboxes = data.map((inbox: any) => ({
          ...inbox,
          agents: inbox.assigned_agents || [],
          instances: inbox.inbox_instances?.map((ii: any) => ii.instance_id) || []
        }));
        setInboxes(mappedInboxes);
      }
    } catch (err) {
      console.error('Error fetching inboxes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [workspaceId]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;

    try {
      // Tenta buscar diretamente do Supabase (banco SQL) para evitar erros de API/KV Store
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          user_id,
          role,
          user:users!workspace_members_user_id_fkey (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) {
        // Se der erro de permissão (42501) ou tabela não existir, falha silenciosamente ou mostra erro
        throw error;
      }

      if (data) {
        const mappedMembers = data.map((m: any) => ({
          user_id: m.user_id,
          workspace_id: m.workspace_id,
          role: m.role,
          name: m.user?.name || 'Usuário',
          email: m.user?.email || '',
          avatar_url: m.user?.avatar_url
        }));
        setMembers(mappedMembers);
      }
    } catch (err) {
      console.error('[useSettingsData] Error fetching members:', err);
      // Não mostrar erro na UI para não bloquear o usuário, apenas logar
      // setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [workspaceId]);

  // Create instance
  const createInstance = useCallback(async (instance: Omit<Instance, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
    if (!workspaceId) return;
    
    // Prevenção de chamadas duplicadas (Race Condition)
    if (creatingRef.current) {
      return;
    }

    creatingRef.current = true;

    try {
      
      const headers = await getAuthHeaders();

      // Use the new centralized endpoint
      // Must pass workspaceId in query for middleware validation
      const response = await fetch(`${API_BASE}/instances/create?workspaceId=${workspaceId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: workspaceId,
          instanceName: instance.name,
          provider: instance.provider, // 'evolution' | 'z-api'
          phone: instance.phone_number
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar instância');
      }

      const data = await response.json();
      
      // data structure: { success: true, message: '...', instance: {...}, qrCode: '...' }
      const newInstance = data.instance;
      const qrCodeData = data.qrCode;

      setInstances((prev) => [...prev, newInstance]);
      
      if (qrCodeData) {
        return {
          ...newInstance,
          qrcode: qrCodeData
        };
      }

      return newInstance;
    } catch (err) {
      console.error('Error creating instance:', err);
      throw err;
    } finally {
      creatingRef.current = false;
    }
  }, [workspaceId]);

  // Update instance
  const updateInstance = useCallback(async (id: string, updates: Partial<Instance>) => {
    if (!workspaceId) return;

    try {
      // Handle DB constraint for 'evolution'
      const finalUpdates = { ...updates };
      if (finalUpdates.provider === 'evolution') {
         finalUpdates.provider = 'whatsapp';
         finalUpdates.settings = {
           ...(finalUpdates.settings || {}),
           provider_type: 'evolution'
         };
      }

      const headers = await getAuthHeaders();

      // Pass workspaceId for middleware validation
      const response = await fetch(`${API_BASE}/instances/${id}?workspaceId=${workspaceId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(finalUpdates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update instance');
      }

      const updatedInstance = await response.json();
      setInstances((prev) => prev.map((inst) => (inst.id === id ? updatedInstance : inst)));
      return updatedInstance;
    } catch (err) {
      console.error('Error updating instance:', err);
      throw err;
    }
  }, [workspaceId]);

  // Delete instance
  const deleteInstance = useCallback(async (id: string) => {
    if (!workspaceId) return;

    try {
      const headers = await getAuthHeaders();
      
      // Pass workspaceId for middleware validation
      const response = await fetch(`${API_BASE}/instances/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete instance');
      }

      setInstances((prev) => prev.filter((inst) => inst.id !== id));
    } catch (err) {
      console.error('Error deleting instance:', err);
      throw err;
    }
  }, [instances, workspaceId]);

  // Check instance status (Gateway API)
  const checkInstanceStatus = useCallback(async (instanceId: string) => {
    if (!workspaceId) return null;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/instances/${instanceId}/status?workspaceId=${workspaceId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      // Update local state if needed
      if (data.status) {
        setInstances((prev) => prev.map(inst => 
            inst.id === instanceId ? { ...inst, status: data.status } : inst
        ));
      }
      
      return data; // { status: "connected"|"disconnected", instance: ... }
    } catch (err) {
      console.error('Error checking instance status:', err);
      return null;
    }
  }, [workspaceId]);

  // Get QR Code (Gateway API)
  const getInstanceQRCode = useCallback(async (instanceId: string) => {
    if (!workspaceId) return null;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/instances/${instanceId}/qrcode?workspaceId=${workspaceId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to get QR Code');
      }

      const data = await response.json();
      return data; // { base64: string, code: string }
    } catch (err) {
      console.error('Error getting instance QR Code:', err);
      return null;
    }
  }, [workspaceId]);

  // Logout instance (Gateway API)
  const logoutInstance = useCallback(async (instanceId: string) => {
    if (!workspaceId) return null;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/instances/${instanceId}/logout?workspaceId=${workspaceId}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to logout instance');
      }

      const data = await response.json();
      
      // Update local state
      if (data.success) {
         setInstances((prev) => prev.map(inst => {
           if (inst.id === instanceId) {
             return { ...inst, status: 'disconnected' };
           }
           return inst;
         }));
      }
      
      return data;
    } catch (err) {
      console.error('Error logging out instance:', err);
      return null;
    }
  }, [workspaceId]);

  // Restart instance (Gateway API)
  const restartInstance = useCallback(async (instanceId: string) => {
    if (!workspaceId) return null;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/instances/${instanceId}/restart?workspaceId=${workspaceId}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to restart instance');
      }

      const data = await response.json();
      
      // Update local state - set to connecting
      if (data.success) {
         setInstances((prev) => prev.map(inst => {
           if (inst.id === instanceId) {
             return { ...inst, status: 'connecting' };
           }
           return inst;
         }));
      }
      
      return data;
    } catch (err) {
      console.error('Error restarting instance:', err);
      return null;
    }
  }, [workspaceId]);

  // Create inbox
  const createInbox = useCallback(async (inbox: Omit<Inbox, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
    if (!workspaceId) return;

    try {
      // Validate unique instances
      if (inbox.instances && inbox.instances.length > 0) {
        const { data: existing } = await supabase
          .from('inbox_instances')
          .select('instance_id')
          .in('instance_id', inbox.instances);

        if (existing && existing.length > 0) {
          const conflictId = existing[0].instance_id;
          const conflictInstance = instances.find(i => i.id === conflictId);
          throw new Error(`A instância "${conflictInstance?.name || conflictId}" já está associada a outra caixa de entrada.`);
        }
      }

      // Prepare payload for main table (inboxes)
      // Map UI 'agents' to DB 'assigned_agents'
      const dbPayload = {
        workspace_id: workspaceId,
        name: inbox.name,
        description: inbox.description,
        auto_assignment: inbox.auto_assignment,
        assigned_agents: inbox.agents || [], // UI sends 'agents', DB expects 'assigned_agents'
        settings: inbox.settings
      };

      const headers = await getAuthHeaders();

      // Create inbox via API (or direct supabase if preferred, but sticking to pattern)
      const response = await fetch(`${API_BASE}/inboxes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(dbPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create inbox');
      }

      const newInbox = await response.json();
      const inboxId = newInbox.id;

      // Handle instances relation (inbox_instances table)
      if (inbox.instances && inbox.instances.length > 0) {
        const instanceRows = inbox.instances.map(instanceId => ({
          inbox_id: inboxId,
          instance_id: instanceId
        }));

        const { error: relationError } = await supabase
          .from('inbox_instances')
          .insert(instanceRows);

        if (relationError) {
          console.error('Error linking instances to inbox:', relationError);
          // Don't fail the whole operation, but warn
        }
      }

      // Construct final object for UI
      const finalInbox = {
        ...newInbox,
        agents: dbPayload.assigned_agents,
        instances: inbox.instances || []
      };

      setInboxes((prev) => [...prev, finalInbox]);
      return finalInbox;
    } catch (err) {
      console.error('Error creating inbox:', err);
      throw err;
    }
  }, [workspaceId, instances]);

  // Update inbox
  const updateInbox = useCallback(async (id: string, updates: Partial<Inbox>) => {
    try {
      // Validate unique instances if updating instances
      if (updates.instances !== undefined && updates.instances.length > 0) {
        const { data: existing } = await supabase
          .from('inbox_instances')
          .select('instance_id')
          .in('instance_id', updates.instances)
          .neq('inbox_id', id); // Exclude current inbox

        if (existing && existing.length > 0) {
          const conflictId = existing[0].instance_id;
          const conflictInstance = instances.find(i => i.id === conflictId);
          throw new Error(`A instância "${conflictInstance?.name || conflictId}" já está associada a outra caixa de entrada.`);
        }
      }

      // Prepare payload for main table
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.auto_assignment !== undefined) dbUpdates.auto_assignment = updates.auto_assignment;
      if (updates.agents !== undefined) dbUpdates.assigned_agents = updates.agents; // Map agents -> assigned_agents
      if (updates.settings !== undefined) dbUpdates.settings = updates.settings;

      // Only call API if there are fields to update on the main table
      let updatedInbox = null;
      if (Object.keys(dbUpdates).length > 0) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/inboxes/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(dbUpdates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update inbox');
        }
        updatedInbox = await response.json();
      }

      // Handle instances relation
      if (updates.instances !== undefined) {
        // 1. Delete existing relations for this inbox
        const { error: deleteError } = await supabase
          .from('inbox_instances')
          .delete()
          .eq('inbox_id', id);
        
        if (deleteError) throw deleteError;

        // 2. Insert new relations
        if (updates.instances.length > 0) {
          const instanceRows = updates.instances.map(instanceId => ({
            inbox_id: id,
            instance_id: instanceId
          }));

          const { error: insertError } = await supabase
            .from('inbox_instances')
            .insert(instanceRows);
            
          if (insertError) throw insertError;
        }
      }

      // Construct final object for UI state
      setInboxes((prev) => prev.map((inb) => {
        if (inb.id === id) {
          return {
            ...inb,
            ...updates, // Apply UI updates directly (agents, instances, name...)
            ...(updatedInbox || {}) // Apply server returned updates if any
          };
        }
        return inb;
      }));

      return updatedInbox; 
    } catch (err) {
      console.error('Error updating inbox:', err);
      throw err;
    }
  }, [instances]);

  // Delete inbox
  const deleteInbox = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/inboxes/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete inbox');
      }

      setInboxes((prev) => prev.filter((inb) => inb.id !== id));
    } catch (err) {
      console.error('Error deleting inbox:', err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchInstances(), fetchInboxes(), fetchMembers()])
      .finally(() => setLoading(false));
  }, [workspaceId, fetchInstances, fetchInboxes, fetchMembers]);

  return {
    instances,
    inboxes,
    members,
    loading,
    error,
    createInstance,
    updateInstance,
    deleteInstance,
    checkInstanceStatus,
    getInstanceQRCode,
    logoutInstance,
    restartInstance,
    createInbox,
    updateInbox,
    deleteInbox,
    refetch: useCallback(() => {
      Promise.all([fetchInstances(), fetchInboxes(), fetchMembers()]);
    }, [fetchInstances, fetchInboxes, fetchMembers]),
  };
}