import { X, Building2, DollarSign, Calendar, Tag, User, MessageSquare, Paperclip, Phone } from 'lucide-react';
import { CRMLead } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { useState, useEffect } from 'react';
import { loadCustomFieldsForLead } from '../services/custom-fields-service';
import { useAuth } from '../contexts/AuthContext';

interface LeadDetailsModalProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  theme: Theme;
}

export function LeadDetailsModal({ lead, isOpen, onClose, onEdit, theme }: LeadDetailsModalProps) {
  const { currentWorkspace } = useAuth();
  const [customFields, setCustomFields] = useState(lead?.customFields || []);
  const [loadingCustomFields, setLoadingCustomFields] = useState(false);

  // 🔥 LAZY LOADING: Carregar custom fields quando abrir modal
  useEffect(() => {
    if (isOpen && lead && currentWorkspace?.id) {
      // Se lead já tem custom fields, usar eles
      if (lead.customFields && lead.customFields.length > 0) {
        setCustomFields(lead.customFields);
      } else {
        // Senão, carregar do banco
        loadCustomFieldsAsync(lead.id);
      }
    }
  }, [isOpen, lead?.id, currentWorkspace?.id]);

  const loadCustomFieldsAsync = async (leadId: string) => {
    if (!currentWorkspace?.id) return;
    
    setLoadingCustomFields(true);
    try {
      const { customFields: loadedFields, error } = await loadCustomFieldsForLead(leadId, currentWorkspace.id);
      
      if (error) {
        console.error('[LEAD DETAILS MODAL] ❌ Erro ao carregar custom fields:', error);
      } else {
        setCustomFields(loadedFields);
      }
    } catch (error) {
      console.error('[LEAD DETAILS MODAL] ❌ Erro inesperado:', error);
    } finally {
      setLoadingCustomFields(false);
    }
  };

  if (!isOpen || !lead) return null;

  const isDark = theme === 'dark';

  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  const priorityLabels = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl rounded-xl border shadow-2xl transition-colors ${
          isDark
            ? 'bg-elevated border-white/[0.08]'
            : 'bg-white border-border-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-start justify-between p-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <div className="flex items-start gap-4">
            <Avatar
              src={lead.avatar}
              alt={lead.clientName}
              size="lg"
            />
            <div>
              <h2 className={`text-xl mb-1 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                {lead.clientName}
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/60' : 'text-text-secondary-light'
              }`}>
                {lead.company}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/60 hover:text-white'
                : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Deal Value - apenas se > 0 */}
            {lead.dealValue > 0 && (
              <div className={`p-4 rounded-lg border ${
                isDark 
                  ? 'bg-white/[0.02] border-white/[0.05]' 
                  : 'bg-light-elevated border-border-light-elevated'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <span className={`text-xs ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Valor do Negócio
                  </span>
                </div>
                <p className={`text-lg ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {lead.dealValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
            )}

            {/* Priority */}
            <div className={`p-4 rounded-lg border ${
              isDark 
                ? 'bg-white/[0.02] border-white/[0.05]' 
                : 'bg-light-elevated border-border-light-elevated'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Tag className={`w-4 h-4 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`} />
                <span className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Prioridade
                </span>
              </div>
              <span className={`inline-flex px-2.5 py-1 rounded-md text-sm border ${priorityColors[lead.priority]}`}>
                {priorityLabels[lead.priority]}
              </span>
            </div>

            {/* Due Date */}
            <div className={`p-4 rounded-lg border ${
              isDark 
                ? 'bg-white/[0.02] border-white/[0.05]' 
                : 'bg-light-elevated border-border-light-elevated'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className={`w-4 h-4 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`} />
                <span className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Data de Vencimento
                </span>
              </div>
              <p className={`text-sm ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                {lead.dueDate && !isNaN(new Date(lead.dueDate).getTime())
                  ? new Date(lead.dueDate).toLocaleDateString('pt-BR')
                  : '-'}
              </p>
            </div>

            {/* Company */}
            <div className={`p-4 rounded-lg border ${
              isDark 
                ? 'bg-white/[0.02] border-white/[0.05]' 
                : 'bg-light-elevated border-border-light-elevated'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className={`w-4 h-4 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`} />
                <span className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Empresa
                </span>
              </div>
              <p className={`text-sm ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                {lead.company}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}>
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag, index) => (
                <span
                  key={index}
                  className={`px-2.5 py-1 rounded-md text-xs border ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.08] text-white/70'
                      : 'bg-light-elevated border-border-light text-text-secondary-light'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <h3 className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}>
              Responsável
            </h3>
            <div className="flex items-center gap-3">
              <Avatar
                src={lead.assignee.avatar}
                alt={lead.assignee.name}
                size="md"
              />
              <div>
                <p className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {lead.assignee.name}
                </p>
                <p className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Gerente de Vendas
                </p>
              </div>
            </div>
          </div>

          {/* Activities */}
          <div>
            <h3 className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}>
              Atividades
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border text-center ${
                isDark 
                  ? 'bg-white/[0.02] border-white/[0.05]' 
                  : 'bg-light-elevated border-border-light-elevated'
              }`}>
                <MessageSquare className={`w-5 h-5 mx-auto mb-1 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`} />
                <p className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Comentários
                </p>
                <p className={`text-sm mt-1 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {lead.activities.comments}
                </p>
              </div>
              <div className={`p-3 rounded-lg border text-center ${
                isDark 
                  ? 'bg-white/[0.02] border-white/[0.05]' 
                  : 'bg-light-elevated border-border-light-elevated'
              }`}>
                <Paperclip className={`w-5 h-5 mx-auto mb-1 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`} />
                <p className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Anexos
                </p>
                <p className={`text-sm mt-1 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {lead.activities.attachments}
                </p>
              </div>
              <div className={`p-3 rounded-lg border text-center ${
                isDark 
                  ? 'bg-white/[0.02] border-white/[0.05]' 
                  : 'bg-light-elevated border-border-light-elevated'
              }`}>
                <Phone className={`w-5 h-5 mx-auto mb-1 ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`} />
                <p className={`text-xs ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Ligações
                </p>
                <p className={`text-sm mt-1 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {lead.activities.calls}
                </p>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          {customFields && customFields.length > 0 && (
            <div>
              <h3 className={`text-sm mb-3 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Campos Personalizados
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className={`p-4 rounded-lg border ${
                      isDark 
                        ? 'bg-white/[0.02] border-white/[0.05]' 
                        : 'bg-light-elevated border-border-light-elevated'
                    }`}
                  >
                    <span className={`text-xs block mb-1.5 ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      {field.fieldName}
                    </span>
                    <p className={`text-sm ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      {field.fieldValue || '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 p-6 border-t ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              isDark
                ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
            }`}
          >
            Fechar
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 rounded-lg text-sm bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
          >
            Editar Lead
          </button>
        </div>
      </div>
    </div>
  );
}