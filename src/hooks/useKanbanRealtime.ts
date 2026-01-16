import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ChangelogEntry {
  id: string;
  sequence: number;
  timestamp: number;
  type: 'lead_created' | 'lead_updated' | 'lead_moved' | 'lead_deleted' | 'funnel_updated';
  entity_id: string;
  user_id: string;
  user_name: string;
  data: any;
}

interface UseKanbanRealtimeOptions {
  workspaceId: string | null;
  currentUserId: string | null;
  enabled: boolean;
  onLeadCreated?: (change: ChangelogEntry) => void;
  onLeadUpdated?: (change: ChangelogEntry) => void;
  onLeadMoved?: (change: ChangelogEntry) => void;
  onLeadDeleted?: (change: ChangelogEntry) => void;
  onFunnelUpdated?: (change: ChangelogEntry) => void;
}

export function useKanbanRealtime(options: UseKanbanRealtimeOptions) {
  const {
    workspaceId,
    currentUserId,
    enabled,
    onLeadCreated,
    onLeadUpdated,
    onLeadMoved,
    onLeadDeleted,
    onFunnelUpdated,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const recentlyMovedLeads = useRef<Set<string>>(new Set());
  
  // ✅ FIX: Usar refs para evitar reconexões desnecessárias
  const callbacksRef = useRef({
    onLeadCreated,
    onLeadUpdated,
    onLeadMoved,
    onLeadDeleted,
    onFunnelUpdated,
  });
  
  // Atualizar refs sempre que os callbacks mudarem
  useEffect(() => {
    callbacksRef.current = {
      onLeadCreated,
      onLeadUpdated,
      onLeadMoved,
      onLeadDeleted,
      onFunnelUpdated,
    };
  }, [onLeadCreated, onLeadUpdated, onLeadMoved, onLeadDeleted, onFunnelUpdated]);

  // Track leads that current user just moved (for conflict detection)
  const trackRecentMove = useCallback((leadId: string) => {
    recentlyMovedLeads.current.add(leadId);
    // Remove from tracking after 10 seconds
    setTimeout(() => {
      recentlyMovedLeads.current.delete(leadId);
    }, 10000);
  }, []);

  const handleLeadChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Determinar quem fez a alteração
    // Nota: O payload do Realtime não inclui dados do usuário, apenas o ID nas colunas created_by/updated_by
    const userId = newRecord?.updated_by || newRecord?.created_by || 'unknown';
    const isCurrentUser = userId === currentUserId;

    const baseEntry: ChangelogEntry = {
      id: crypto.randomUUID(),
      sequence: Date.now(),
      timestamp: Date.now(),
      type: 'lead_updated', // placeholder
      entity_id: newRecord?.id || oldRecord?.id,
      user_id: userId,
      user_name: 'Outro usuário', // Não temos o nome aqui
      data: newRecord,
    };

    if (eventType === 'INSERT') {
      const entry = { ...baseEntry, type: 'lead_created' } as const;
      
      if (!isCurrentUser && callbacksRef.current.onLeadCreated) {
        callbacksRef.current.onLeadCreated(entry);
        toast.info('Novo lead criado', { duration: 3000 });
      }
    } 
    else if (eventType === 'DELETE') {
      const entry = { ...baseEntry, type: 'lead_deleted', entity_id: oldRecord.id } as const;
      
      if (!isCurrentUser && callbacksRef.current.onLeadDeleted) {
        callbacksRef.current.onLeadDeleted(entry);
        toast.info('Lead deletado', { duration: 3000 });
      }
    } 
    else if (eventType === 'UPDATE') {
      // Verificar se foi movimento (mudou coluna ou posição)
      const isMove = newRecord.column_id !== oldRecord.column_id || newRecord.position !== oldRecord.position;
      
      if (isMove) {
        const entry = { ...baseEntry, type: 'lead_moved' } as const;
        
        // Conflict detection
        if (!isCurrentUser && recentlyMovedLeads.current.has(entry.entity_id)) {
           toast.warning(
            'Conflito de edição: Este lead foi movido por outro usuário',
            {
              description: 'O quadro foi atualizado.',
              duration: 5000,
            }
          );
        }

        if (!isCurrentUser && callbacksRef.current.onLeadMoved) {
          callbacksRef.current.onLeadMoved(entry);
        }
      } else {
        // Apenas update normal
        const entry = { ...baseEntry, type: 'lead_updated' } as const;
        
        if (!isCurrentUser && callbacksRef.current.onLeadUpdated) {
          callbacksRef.current.onLeadUpdated(entry);
        }
      }
    }
  }, [currentUserId]);

  const handleFunnelChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const { new: newRecord } = payload;
    const userId = newRecord?.updated_by || 'unknown';
    const isCurrentUser = userId === currentUserId;

    if (!isCurrentUser && callbacksRef.current.onFunnelUpdated) {
      const entry: ChangelogEntry = {
        id: crypto.randomUUID(),
        sequence: Date.now(),
        timestamp: Date.now(),
        type: 'funnel_updated',
        entity_id: newRecord?.id,
        user_id: userId,
        user_name: 'Outro usuário',
        data: newRecord,
      };
      
      callbacksRef.current.onFunnelUpdated(entry);
      toast.info('Funil atualizado', { duration: 3000 });
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setIsConnected(false);
      return;
    }

    const channelName = `kanban-${workspaceId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
      }
    });

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          handleLeadChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'funnels',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          handleFunnelChange(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [workspaceId, enabled]); // ✅ FIX: Removido handleLeadChange e handleFunnelChange (agora usam callbacksRef)

  return {
    trackRecentMove,
    isPolling: isConnected, // Mantendo o nome da prop para compatibilidade
  };
}