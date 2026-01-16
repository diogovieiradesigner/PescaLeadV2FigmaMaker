import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Dialog } from '../ui/dialog';
import { getFunnelsByWorkspace } from '../../services/funnels-service';
import { Funnel, KanbanColumn } from '../../types/crm';
import { fetchContactProfile, ContactProfile } from '../../services/chat-service';

interface AddLeadToKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  workspaceId: string;
  contactName: string;
  contactPhone: string;
  conversationId: string; // ✅ Adicionar conversationId para buscar perfil
  onLeadCreated: (leadId: string) => void;
  onKanbanRefresh?: () => void; // ✅ Callback para refresh do kanban
}

export function AddLeadToKanbanModal({
  isOpen,
  onClose,
  theme,
  workspaceId,
  contactName,
  contactPhone,
  conversationId, // ✅ Receber conversationId
  onLeadCreated,
  onKanbanRefresh, // ✅ Callback para refresh do kanban
}: AddLeadToKanbanModalProps) {
  const isDark = theme === 'dark';
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false); // ✅ Estado para loading do perfil
  const [error, setError] = useState<string | null>(null);
  const [contactProfile, setContactProfile] = useState<ContactProfile | null>(null); // ✅ Estado para perfil

  // ✅ Buscar perfil do contato ao abrir o modal
  useEffect(() => {
    if (isOpen && workspaceId && conversationId && contactPhone) {
      loadContactProfile();
    }
  }, [isOpen, workspaceId, conversationId, contactPhone]);

  // ✅ Função para buscar perfil do contato
  const loadContactProfile = async () => {
    setLoadingProfile(true);
    try {
      const { profile, error: profileError } = await fetchContactProfile(
        workspaceId,
        conversationId,
        contactPhone
      );

      if (profileError) {
        // Não mostrar erro para o usuário, apenas log
      } else if (profile) {
        setContactProfile(profile);
      }
    } catch (err) {
      console.error('[AddLeadModal] Erro ao buscar perfil:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Buscar funis ao abrir o modal
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadFunnels();
    }
  }, [isOpen, workspaceId]);

  // Atualizar colunas quando o funil selecionado mudar
  useEffect(() => {
    if (selectedFunnelId) {
      const funnel = funnels.find(f => f.id === selectedFunnelId);
      if (funnel) {
        setColumns(funnel.columns);
        // Selecionar a primeira coluna por padrão
        if (funnel.columns.length > 0) {
          setSelectedColumnId(funnel.columns[0].id);
        }
      }
    } else {
      setColumns([]);
      setSelectedColumnId('');
    }
  }, [selectedFunnelId, funnels]);

  const loadFunnels = async () => {
    setLoadingFunnels(true);
    setError(null);
    try {
      const { funnels: fetchedFunnels, error: funnelsError } = await getFunnelsByWorkspace(workspaceId);
      if (funnelsError) {
        setError('Erro ao carregar funis');
        console.error('[AddLeadModal] Erro ao carregar funis:', funnelsError);
        return;
      }
      setFunnels(fetchedFunnels || []);
      
      // Selecionar o primeiro funil por padrão
      if (fetchedFunnels && fetchedFunnels.length > 0) {
        setSelectedFunnelId(fetchedFunnels[0].id);
      }
    } catch (err) {
      setError('Erro ao carregar funis');
      console.error('[AddLeadModal] Erro ao carregar funis:', err);
    } finally {
      setLoadingFunnels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFunnelId || !selectedColumnId) {
      setError('Selecione um funil e uma coluna');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Importar a função de criar lead dinamicamente para evitar circular dependency
      const { createLeadFromConversation } = await import('../../services/leads-service');
      
      // ✅ Preparar dados com campos personalizados do perfil
      const leadData: any = {
        workspaceId,
        funnelId: selectedFunnelId,
        columnId: selectedColumnId,
        clientName: contactProfile?.name || contactName, // ✅ Usar nome do perfil se disponível
        phone: contactPhone,
      };

      // ✅ Adicionar campos personalizados se disponíveis no perfil
      if (contactProfile?.email) {
        leadData.email = contactProfile.email;
      }
      
      if (contactProfile?.description) {
        leadData.description = contactProfile.description;
      }
      
      if (contactProfile?.website) {
        leadData.website = contactProfile.website;
      }
      
      const { leadId, error: createError } = await createLeadFromConversation(leadData);

      if (createError) {
        setError('Erro ao criar lead');
        console.error('[AddLeadModal] Erro ao criar lead:', createError);
        return;
      }

      onLeadCreated(leadId);
      if (onKanbanRefresh) { // ✅ Chama o callback para refresh do kanban
        onKanbanRefresh();
      }
      onClose();
    } catch (err) {
      setError('Erro ao criar lead');
      console.error('[AddLeadModal] Erro ao criar lead:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/50'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl ${
          isDark ? 'bg-elevated border border-white/[0.08]' : 'bg-white border border-border-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <h2 className={`${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Adicionar Lead ao Kanban
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/[0.08] text-white/70' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informações do Lead */}
          <div>
            <label className={`block text-sm mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Nome do Cliente
            </label>
            <input
              type="text"
              value={contactName}
              disabled
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.08] text-white/50'
                  : 'bg-gray-50 border-border-light text-text-secondary-light'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Telefone
            </label>
            <input
              type="text"
              value={contactPhone}
              disabled
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.08] text-white/50'
                  : 'bg-gray-50 border-border-light text-text-secondary-light'
              }`}
            />
          </div>

          {/* ✅ Indicador de dados encontrados no perfil */}
          {loadingProfile && (
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                🔍 Buscando dados do perfil...
              </p>
            </div>
          )}
          
          {!loadingProfile && contactProfile && (contactProfile.email || contactProfile.description || contactProfile.website) && (
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm mb-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                ✅ Dados encontrados automaticamente:
              </p>
              <ul className={`text-xs space-y-1 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                {contactProfile.name && <li>• Nome: {contactProfile.name}</li>}
                {contactProfile.email && <li>• Email: {contactProfile.email}</li>}
                {contactProfile.description && <li>• Descrição: {contactProfile.description}</li>}
                {contactProfile.website && <li>• Website: {contactProfile.website}</li>}
              </ul>
            </div>
          )}

          {/* Seleção de Funil */}
          <div>
            <label className={`block text-sm mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Funil <span className="text-red-500">*</span>
            </label>
            {loadingFunnels ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
              </div>
            ) : funnels.length === 0 ? (
              <p className={`text-sm py-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Nenhum funil encontrado
              </p>
            ) : (
              <select
                value={selectedFunnelId}
                onChange={(e) => setSelectedFunnelId(e.target.value)}
                style={isDark ? { colorScheme: 'dark' } : undefined}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#0169D9] ${
                  isDark
                    ? 'bg-elevated border-white/[0.08] text-white'
                    : 'bg-white border-border-light text-text-primary-light'
                }`}
                required
              >
                {funnels.map((funnel) => (
                  <option key={funnel.id} value={funnel.id} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>
                    {funnel.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Seleção de Coluna */}
          {selectedFunnelId && (
            <div>
              <label className={`block text-sm mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                Etapa (Coluna) <span className="text-red-500">*</span>
              </label>
              {columns.length === 0 ? (
                <p className={`text-sm py-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Nenhuma coluna encontrada
                </p>
              ) : (
                <select
                  value={selectedColumnId}
                  onChange={(e) => setSelectedColumnId(e.target.value)}
                  style={isDark ? { colorScheme: 'dark' } : undefined}
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-elevated border-white/[0.08] text-white'
                      : 'bg-white border-border-light text-text-primary-light'
                  }`}
                  required
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>
                      {column.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors border ${
                isDark
                  ? 'bg-elevated border-white/[0.08] text-white hover:bg-white/[0.08]'
                  : 'bg-white border-border-light text-text-primary-light hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                loading || !selectedFunnelId || !selectedColumnId
                  ? 'bg-[#0169D9]/50 text-white/50 cursor-not-allowed'
                  : 'bg-[#0169D9] text-white hover:bg-[#0169D9]/90'
              }`}
              disabled={loading || !selectedFunnelId || !selectedColumnId}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </span>
              ) : (
                'Adicionar Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}