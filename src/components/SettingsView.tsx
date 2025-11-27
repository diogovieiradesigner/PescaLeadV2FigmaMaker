import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Phone, Inbox as InboxIcon, Users, RefreshCw, Link as LinkIcon, RotateCcw, Sun, Moon } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { InstanceModal } from './settings/InstanceModal';
import { InboxModal } from './settings/InboxModal';
import { QrCodeModal } from './settings/QrCodeModal';
import { WorkspaceMember } from '../hooks/useSettingsData';
import { ProfileMenu } from './ProfileMenu';

export interface Instance {
  id: string;
  name: string;
  provider: 'whatsapp' | 'instagram' | 'telegram' | 'evolution';
  phone_number: string;
  inbox: string;
  status: 'connected' | 'disconnected';
}

export interface Inbox {
  id: string;
  name: string;
  agents: string[]; // IDs of workspace members
  instances: string[];
  working_hours?: {
    start: string;
    end: string;
  };
}

interface SettingsViewProps {
  theme: Theme;
  onThemeToggle?: () => void;
  onNavigateToSettings?: () => void;
  instances: Instance[];
  setInstances?: (instances: Instance[]) => void;
  inboxes: Inbox[];
  setInboxes?: (inboxes: Inbox[]) => void;
  members: WorkspaceMember[]; // Changed from agents to members
  workspaceId: string;
  accessToken: string;
  
  createInstance?: (instance: Omit<Instance, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  updateInstance?: (id: string, updates: Partial<Instance>) => Promise<any>;
  deleteInstance?: (id: string) => Promise<void>;
  checkInstanceStatus?: (instanceId: string) => Promise<any>;
  getInstanceQRCode?: (instanceId: string) => Promise<any>;
  logoutInstance?: (instanceId: string) => Promise<any>;
  restartInstance?: (instanceId: string) => Promise<any>;
  
  createInbox?: (inbox: Omit<Inbox, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  updateInbox?: (id: string, updates: Partial<Inbox>) => Promise<any>;
  deleteInbox?: (id: string) => Promise<void>;
}

export function SettingsView({ 
  theme,
  onThemeToggle,
  onNavigateToSettings,
  instances, 
  setInstances, 
  inboxes, 
  setInboxes, 
  members,
  workspaceId,
  accessToken,
  createInstance,
  updateInstance,
  deleteInstance,
  checkInstanceStatus,
  getInstanceQRCode,
  logoutInstance,
  restartInstance,
  createInbox,
  updateInbox,
  deleteInbox
}: SettingsViewProps) {
  const isDark = theme === 'dark';
  // ❌ REMOVIDO: const [activeTab, setActiveTab] = useState<'instances' | 'inboxes'>('instances');
  
  const [isInstanceModalOpen, setIsInstanceModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState<Inbox | null>(null);

  // QR Code Modal State
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [connectingInstanceId, setConnectingInstanceId] = useState<string | null>(null);

  // Status checking
  const checkedRef = useRef(new Set<string>());
  const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({});

  // Poll for connection status while QR code modal is open
  useEffect(() => {
    if (!isQrCodeModalOpen || !connectingInstanceId || !checkInstanceStatus || !updateInstance) return;

    const intervalId = setInterval(async () => {
      try {
        const data = await checkInstanceStatus(connectingInstanceId);
        // Check both data.status and data.raw.instance.state
        const isConnected = data?.status === 'connected' || data?.raw?.instance?.state === 'open';
        
        if (isConnected) {
          await updateInstance(connectingInstanceId, { status: 'connected' });
          setIsQrCodeModalOpen(false);
          setConnectingInstanceId(null);
          alert('Instância conectada com sucesso!');
        }
      } catch (error) {
        console.error('Error checking status during QR display:', error);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isQrCodeModalOpen, connectingInstanceId, checkInstanceStatus, updateInstance]);

  // Auto-check status on load
  useEffect(() => {
    if (instances.length > 0 && checkInstanceStatus && updateInstance) {
      instances.forEach(instance => {
        if (!checkedRef.current.has(instance.id)) {
          checkedRef.current.add(instance.id);
          
          // Mark as checking
          setCheckingStatus(prev => ({ ...prev, [instance.id]: true }));

          checkInstanceStatus(instance.id)
            .then(data => {
              if (data) {
                // ✅ Check multiple possible status indicators:
                // - data.status (our normalized status)
                // - data.raw.instance.state (Evolution format)
                // - data.raw.instance.status (Uazapi format)
                // - data.raw.status.connected (Uazapi format)
                const isConnected = 
                  data.status === 'connected' || 
                  data.raw?.instance?.state === 'open' ||
                  data.raw?.instance?.status === 'connected' ||
                  data.raw?.status?.connected === true;
                
                const newStatus = isConnected ? 'connected' : 'disconnected';
                
                // ✅ NÃO ATUALIZAR SE ESTIVER "connecting" (aguardando QR code)
                if (data.status === 'connecting') {
                  console.log(`[SettingsView] ${instance.name} is connecting, not updating status in database`);
                  return;
                }
                
                if (newStatus !== instance.status) {
                  console.log(`[SettingsView] Updating ${instance.name} status: ${instance.status} → ${newStatus}`);
                  updateInstance(instance.id, { status: newStatus });
                }
              }
            })
            .catch(err => console.error(`Error checking status for ${instance.name}:`, err))
            .finally(() => {
               setCheckingStatus(prev => ({ ...prev, [instance.id]: false }));
            });
        }
      });
    }
  }, [instances, checkInstanceStatus, updateInstance]);

  const handleEditInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setIsInstanceModalOpen(true);
  };

  const handleAddInstance = () => {
    setSelectedInstance(null);
    setIsInstanceModalOpen(true);
  };

  const handleDeleteInstance = async (id: string) => {
    try {
      if (deleteInstance) {
        await deleteInstance(id);
      } else {
        setInstances?.(instances.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
    }
  };

  const handleSaveInstance = async (instance: Instance) => {
    try {
      let result;
      if (selectedInstance) {
        // Update
        if (updateInstance) {
          await updateInstance(instance.id, {
            name: instance.name,
            provider: instance.provider,
            phone_number: instance.phone_number,
          });
        } else {
          setInstances?.(instances.map(i => i.id === instance.id ? instance : i));
        }
      } else {
        // Create
        if (createInstance) {
          result = await createInstance({
            name: instance.name,
            provider: instance.provider,
            phone_number: instance.phone_number,
            status: 'disconnected',
          });
        } else {
          setInstances?.([...instances, { ...instance, id: Date.now().toString() }]);
        }
      }
      
      // Se tiver QR Code no resultado, retorna o resultado e mantém o modal aberto
      // para que o InstanceModal possa exibir o QR Code
      if (result?.qrcode || result?.z_api_data?.qr_code) {
        return result;
      }

      setIsInstanceModalOpen(false);
      setSelectedInstance(null);
      return result;
    } catch (error) {
      console.error('Error saving instance:', error);
      throw error; // Re-throw to be caught by the modal
    }
  };

  const handleConnect = async (instance: Instance) => {
    if (!getInstanceQRCode) return;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 [FRONTEND] CONNECT BUTTON CLICKED');
    console.log('   Instance:', instance.name);
    console.log('   Provider:', instance.settings?.provider_type || instance.provider);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    setConnectingInstanceId(instance.id);
    try {
       console.log('📡 [FRONTEND] Calling getInstanceQRCode API...');
       const data = await getInstanceQRCode(instance.id);
       
       console.log('📥 [FRONTEND] Response received:', data);
       
       // Se estiver conectado
       if (data.connected) {
          console.log('✅ [FRONTEND] Instance already connected');
          if (updateInstance) {
             updateInstance(instance.id, { status: 'connected' });
          }
          alert('Instância já está conectada!');
          return;
       }

       // Se retornar QR Code
       let code = data.base64 || data.qrcode || data.pairingCode;
       
       console.log('🔍 [FRONTEND] Looking for QR code...');
       console.log('   data.base64:', data.base64 ? 'present' : 'missing');
       console.log('   data.qrcode:', data.qrcode ? 'present' : 'missing');
       console.log('   data.pairingCode:', data.pairingCode ? 'present' : 'missing');
       
       // ✅ NOVO: Também procurar em data.raw.instance (formato Uazapi)
       if (!code && data.raw?.instance) {
          code = data.raw.instance.qrcode || data.raw.instance.paircode;
          console.log('   data.raw.instance.qrcode:', data.raw.instance.qrcode ? 'present' : 'missing');
          console.log('   data.raw.instance.paircode:', data.raw.instance.paircode ? 'present' : 'missing');
       }
       
       // Garantir que é string se vier objeto
       if (typeof code === 'object' && code !== null) {
          code = code.base64 || code.qrcode || code.pairingCode;
       }

       if (code && typeof code === 'string') {
          console.log('✅ [FRONTEND] QR Code found! Opening modal...');
          
          // ⚠️ NOVO: Se houver mensagem de aviso da API, mostrar ao usuário
          if (data.message) {
            console.warn('⚠️ [FRONTEND] API Warning:', data.message);
            alert(
              `⚠️ Aviso da API:\n\n${data.message}\n\n💡 Dica: Crie sua instância novamente caso queira conectar mais rápido.`
            );
          }
          
          setQrCodeData(code);
          setIsQrCodeModalOpen(true);
       } else {
          console.error('❌ [FRONTEND] No QR code found in response');
          console.error('   Full response:', JSON.stringify(data, null, 2));
          
          // ⚠️ NOVO: Se houver mensagem mas não tiver QR Code, mostrar a mensagem
          if (data.message || data.raw?.response) {
            const apiMessage = data.message || data.raw?.response;
            alert(
              `⚠️ Aviso da API:\n\n${apiMessage}\n\n💡 Dica: Crie sua instância novamente caso queira conectar mais rápido.`
            );
          } else {
            alert('Erro: Nenhum QR Code retornado pela API. Verifique o console.');
          }
       }
    } catch (error) {
       console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
       console.error('❌ [FRONTEND] ERROR GETTING QR CODE');
       console.error('   Error type:', error.constructor?.name);
       console.error('   Error message:', error.message);
       console.error('   Error stack:', error.stack);
       console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
       alert('Erro ao obter QR Code. Verifique o console.');
    } finally {
       setConnectingInstanceId(null);
    }
  };

  const handleDisconnect = async (instance: Instance) => {
    if (!logoutInstance || !updateInstance) return;
    
    if (!confirm('Tem certeza que deseja desconectar esta instância?')) return;

    try {
       // Atualiza UI para desconectado imediatamente para feedback rápido
       if (updateInstance) {
          updateInstance(instance.id, { status: 'disconnected' });
       }

       const result = await logoutInstance(instance.id);
       
       if (result && result.status) {
         alert('Instância desconectada com sucesso!');
       } else {
         alert('Erro ao desconectar. Tente novamente.');
         // Reverte se falhou (opcional, mas bom para consistência)
         // await updateInstance(instance.id, { status: 'connected' }); 
       }
    } catch (error) {
       console.error('Error logging out:', error);
       alert('Erro ao processar desconexão.');
    }
  };

  const handleRestart = async (instance: Instance) => {
    if (!restartInstance || !updateInstance) return;
    
    if (!confirm('Tem certeza que deseja reiniciar esta instância? Isso pode levar alguns segundos.')) return;

    try {
       // Feedback visual imediato
       if (updateInstance) {
          updateInstance(instance.id, { status: 'connecting' });
       }

       await restartInstance(instance.id);
       alert('Reinicialização solicitada com sucesso! Aguarde alguns instantes.');
       
    } catch (error) {
       console.error('Error restarting:', error);
       alert('Erro ao reiniciar instância.');
       // Reverte status se falhar (assumindo que estava conectado)
       if (updateInstance) updateInstance(instance.id, { status: 'connected' });
    }
  };

  const handleRefreshStatus = async () => {
     if (!checkInstanceStatus || !updateInstance) return;
     
     // Reset checked ref to allow re-check
     checkedRef.current.clear();
     
     // Trigger checks
     const promises = instances.map(async (instance) => {
        setCheckingStatus(prev => ({ ...prev, [instance.id]: true }));
        try {
           const data = await checkInstanceStatus(instance.id);
           console.log(`Status check result for ${instance.name}:`, data);
           
           const connected = data.status === 'connected' || data.raw?.instance?.state === 'open';
           
           updateInstance(instance.id, { 
              status: connected ? 'connected' : 'disconnected'
           });
        } catch (error) {
           console.error(`Error checking status for ${instance.id}:`, error);
        } finally {
           setCheckingStatus(prev => ({ ...prev, [instance.id]: false }));
        }
     });
     
     await Promise.all(promises);
  };

  const handleCheckWebhook = async (instance: Instance) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/make-server-e4f9d774/instances/${instance.id}/webhook/check?workspaceId=${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        console.log('Webhook config:', data);
        alert(`✅ Configuração do Webhook:\n\n` +
              `Nome da Instância: ${data.instance.name}\n` +
              `Status: ${data.instance.status}\n` +
              `Webhook no DB: ${data.instance.webhook_in_db}\n\n` +
              `Veja o console para mais detalhes.`);
      } else {
        alert(`❌ Erro ao verificar webhook: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking webhook:', error);
      alert('❌ Erro ao verificar webhook. Veja o console.');
    }
  };

  const handleFixWebhook = async (instance: Instance) => {
    if (!confirm(`🔧 Deseja forçar a atualização do webhook da instância "${instance.name}"?\n\nIsso vai reconfigurar o webhook na Evolution API.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/make-server-e4f9d774/instances/${instance.id}/webhook/update?workspaceId=${workspaceId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        console.log('Webhook updated:', data);
        alert(`✅ Webhook atualizado com sucesso!\n\n` +
              `URL: ${data.webhook_url}\n\n` +
              `Agora envie uma mensagem de teste para a instância.`);
      } else {
        alert(`❌ Erro ao atualizar webhook: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fixing webhook:', error);
      alert('❌ Erro ao atualizar webhook. Veja o console.');
    }
  };

  const handleEditInbox = (inbox: Inbox) => {
    setSelectedInbox(inbox);
    setIsInboxModalOpen(true);
  };

  const handleAddInbox = () => {
    setSelectedInbox(null);
    setIsInboxModalOpen(true);
  };

  const handleDeleteInbox = async (id: string) => {
    try {
      if (deleteInbox) {
        await deleteInbox(id);
      } else {
        setInboxes?.(inboxes.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Error deleting inbox:', error);
    }
  };

  const handleSaveInbox = async (inbox: Inbox) => {
    try {
      if (selectedInbox) {
        // Update
        if (updateInbox) {
          await updateInbox(inbox.id, {
            name: inbox.name,
            agents: inbox.agents,
            instances: inbox.instances,
            working_hours: inbox.working_hours,
          });
        } else {
          setInboxes?.(inboxes.map(i => i.id === inbox.id ? inbox : i));
        }
      } else {
        // Create
        if (createInbox) {
          await createInbox({
            name: inbox.name,
            agents: inbox.agents,
            instances: inbox.instances,
            working_hours: inbox.working_hours,
          });
        } else {
          setInboxes?.([...inboxes, { ...inbox, id: `inbox-${Date.now()}` }]);
        }
      }
      setIsInboxModalOpen(false);
      setSelectedInbox(null);
    } catch (error) {
      console.error('Error saving inbox:', error);
    }
  };

  const getMemberName = (userId: string) => {
    return members.find(m => m.user_id === userId)?.name || 'Desconhecido';
  };

  // Filter instances that are already assigned to other inboxes
  const availableInstances = instances.filter(inst => {
    const isAssignedToOtherInbox = inboxes.some(inbox => 
      inbox.instances && 
      inbox.instances.includes(inst.id) && 
      inbox.id !== selectedInbox?.id
    );
    return !isAssignedToOtherInbox;
  });

  const handleRefreshQrCode = async () => {
    if (!connectingInstanceId || !getInstanceQRCode) return;
    try {
       const data = await getInstanceQRCode(connectingInstanceId);
       
       if (data.connected) {
          if (updateInstance) {
             updateInstance(connectingInstanceId, { status: 'connected' });
          }
          alert('Instância conectada com sucesso!');
          setIsQrCodeModalOpen(false);
          setConnectingInstanceId(null);
          return;
       }

       const code = data.base64 || data.qrcode;
       if (code) {
          setQrCodeData(code);
       }
    } catch (error) {
       console.error('Error refreshing QR Code:', error);
    }
  };

  return (
    <div className={`flex-1 transition-colors ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
      {/* Header */}
      <div className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}>
        <h1 className={`text-xl ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Configurações
        </h1>
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          {onThemeToggle && (
            <button
              onClick={onThemeToggle}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white/70'
                  : 'hover:bg-light-elevated text-text-secondary-light'
              }`}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}

          {/* Profile */}
          <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
        </div>
      </div>

      {/* ✅ NOVO: Layout de 2 colunas lado a lado */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ========== COLUNA 1: INSTÂNCIAS ========== */}
        <div className={`flex flex-col rounded-lg border p-6 ${
          isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-light-elevated border-border-light'
        }`}>
          <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <div>
              <h2 className={`text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                <Phone className="w-5 h-5" />
                Instâncias de Conexão
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Gerencie as conexões do WhatsApp e outros canais
              </p>
            </div>
            <div className="flex gap-2">
               <button
                onClick={handleRefreshStatus}
                className={`p-2 rounded-lg border transition-colors ${
                  isDark 
                     ? 'border-white/[0.08] hover:bg-white/[0.05] text-white' 
                     : 'border-border-light hover:bg-light-elevated-hover text-text-primary-light'
                }`}
                title="Atualizar status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleAddInstance}
                className="p-2 rounded-lg bg-[#0169D9] hover:bg-[#0169D9]/90 text-white transition-colors"
                title="Nova Instância"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            {instances.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Nenhuma instância configurada.
              </p>
            ) : instances.map((instance) => (
              <div
                key={instance.id}
                className={`p-4 rounded-lg border ${
                  isDark
                    ? 'bg-elevated border-white/[0.08]'
                    : 'bg-light-elevated border-border-light'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {instance.name}
                      </h3>
                      <div className="flex items-center gap-2">
                         <span
                           className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                             instance.status === 'connected'
                               ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                               : 'bg-red-500/10 text-red-500 border border-red-500/20'
                           }`}
                         >
                           {checkingStatus[instance.id] && <RefreshCw className="w-3 h-3 animate-spin" />}
                           {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                         </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                        <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>Provider:</span>{' '}
                        {/* ✅ Mapeamento dinâmico de providers */}
                        {instance.provider === 'evolution' ? 'Evolution API' : 
                         instance.provider === 'uazapi' ? 'Uazapi' : 
                         instance.provider === 'whatsapp' ? 'WhatsApp' : 
                         instance.provider === 'instagram' ? 'Instagram' : 
                         instance.provider === 'telegram' ? 'Telegram' : 
                         instance.provider.charAt(0).toUpperCase() + instance.provider.slice(1)}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                        <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>Telefone:</span>{' '}
                        {instance.phone_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* Botão de Conectar / Desconectar */}
                    {instance.status !== 'connected' ? (
                      <button
                         onClick={() => handleConnect(instance)}
                         className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                           isDark
                             ? 'bg-green-600/20 hover:bg-green-600/30 text-green-500'
                             : 'bg-green-100 hover:bg-green-200 text-green-700'
                         }`}
                         disabled={connectingInstanceId === instance.id}
                      >
                         {connectingInstanceId === instance.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                         ) : (
                            <LinkIcon className="w-4 h-4" />
                         )}
                         Conectar
                      </button>
                    ) : (
                      <>
                         {/* ✅ ESCONDE botão Reiniciar se for Uazapi (não tem esse endpoint) */}
                         {instance.provider_type !== 'uazapi' && instance.settings?.provider_type !== 'uazapi' && (
                            <button
                               onClick={() => handleRestart(instance)}
                               className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                 isDark
                                   ? 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-500'
                                   : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                               }`}
                               title="Reiniciar Instância"
                            >
                               <RotateCcw className="w-4 h-4" />
                            </button>
                         )}
                         
                         <button
                            onClick={() => handleDisconnect(instance)}
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                              isDark
                                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-500'
                                : 'bg-red-100 hover:bg-red-200 text-red-700'
                            }`}
                         >
                            <LinkIcon className="w-4 h-4" />
                            Desconectar
                         </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteInstance(instance.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========== COLUNA 2: CAIXAS DE ENTRADA ========== */}
        <div className={`flex flex-col rounded-lg border p-6 ${
          isDark ? 'bg-[#141414] border-white/[0.08]' : 'bg-light-elevated border-border-light'
        }`}>
          <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <div>
              <h2 className={`text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                <InboxIcon className="w-5 h-5" />
                Caixas de Entrada
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Organize atendimentos por departamentos ou equipes
              </p>
            </div>
            <button
              onClick={handleAddInbox}
              className="p-2 rounded-lg bg-[#0169D9] hover:bg-[#0169D9]/90 text-white transition-colors"
              title="Nova Caixa de Entrada"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-4 overflow-y-auto max-h-[calc(100vh-280px)]">
            {inboxes.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Nenhuma caixa de entrada configurada.
              </p>
            ) : inboxes.map((inbox) => (
              <div
                key={inbox.id}
                className={`p-4 rounded-lg border ${
                  isDark
                    ? 'bg-elevated border-white/[0.08]'
                    : 'bg-light-elevated border-border-light'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`mb-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {inbox.name}
                    </h3>
                    <div>
                      <p className={`text-sm mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Atendentes com Acesso:
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {inbox.agents && inbox.agents.length > 0 ? inbox.agents.map((userId) => (
                          <span
                            key={userId}
                            className={`text-xs px-2 py-1 rounded ${
                              isDark
                                ? 'bg-white/[0.05] text-white/70'
                                : 'bg-light-bg text-text-secondary-light'
                            }`}
                          >
                            {getMemberName(userId)}
                          </span>
                        )) : (
                          <span className={`text-xs italic ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}>
                            Nenhum atendente
                          </span>
                        )}
                      </div>
                      {inbox.working_hours && (
                        <p className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                          <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>Horário:</span>{' '}
                          {inbox.working_hours.start} - {inbox.working_hours.end}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditInbox(inbox)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark
                          ? 'hover:bg-white/[0.05] text-white/50'
                          : 'hover:bg-light-elevated-hover text-text-secondary-light'
                      }`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInbox(inbox.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instance Modal */}
      {isInstanceModalOpen && (
        <InstanceModal
          theme={theme}
          instance={selectedInstance}
          inboxes={inboxes}
          onClose={() => setIsInstanceModalOpen(false)}
          onSave={handleSaveInstance}
        />
      )}

      {/* Inbox Modal */}
      {isInboxModalOpen && (
        <InboxModal
          theme={theme}
          inbox={selectedInbox}
          members={members}
          instances={availableInstances}
          onClose={() => setIsInboxModalOpen(false)}
          onSave={handleSaveInbox}
        />
      )}

      {/* QR Code Modal */}
      {isQrCodeModalOpen && (
        <QrCodeModal
          theme={theme}
          qrCode={qrCodeData}
          onClose={() => {
            setIsQrCodeModalOpen(false);
            setConnectingInstanceId(null);
          }}
          onRefresh={handleRefreshQrCode}
          onComplete={async () => {
            // ✅ NOVO: Ao clicar em "Concluído", marcar como conectado
            if (connectingInstanceId && updateInstance) {
              console.log('[QrCodeModal] User clicked "Concluído", marking instance as connected...');
              await updateInstance(connectingInstanceId, { status: 'connected' });
              alert('Instância marcada como conectada!');
            }
            setIsQrCodeModalOpen(false);
            setConnectingInstanceId(null);
          }}
        />
      )}
    </div>
  );
}