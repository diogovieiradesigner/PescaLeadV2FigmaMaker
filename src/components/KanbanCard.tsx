import { Phone, Mail, Star, Trash2, DollarSign, Send } from 'lucide-react';
import { CRMLead } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { memo, useState } from 'react';
import { openEmailCompose } from '../utils/email-helper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface KanbanCardProps {
  lead: CRMLead;
  isDragging: boolean;
  theme: Theme;
  onClick?: () => void;
  onDelete?: (leadId: string) => void;
}

// 🎨 Cores de prioridade conforme especificação
const priorityConfig = {
  high: {
    label: 'Alta',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-500/10',
    icon: '🔴'
  },
  medium: {
    label: 'Média',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgLight: 'bg-yellow-500/10',
    icon: '🟡'
  },
  low: {
    label: 'Baixa',
    color: 'bg-gray-400',
    textColor: 'text-gray-400',
    bgLight: 'bg-gray-400/10',
    icon: '⚪'
  }
};

// 🔧 Formatar valor monetário
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// 🔧 Formatar telefone
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '');
  
  // Formata: (11) 98765-4321
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  
  // Formata: (11) 3456-7890
  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  return phone; // Retorna original se não for formato brasileiro
};

function KanbanCardComponent({ lead, isDragging, theme, onClick, onDelete }: KanbanCardProps) {
  const isDark = theme === 'dark';
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 🔍 DEBUG desativado para produção
  // console.log('[KanbanCard] Lead data:', {
  //   id: lead.id,
  //   clientName: lead.clientName,
  //   email: lead.email,
  //   phone: lead.phone,
  //   dealValue: lead.dealValue,
  //   assignee: lead.assignee,
  // });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(false);
    onDelete?.(lead.id);
  };

  // ✅ Regras de exibição conforme especificação
  const shouldShowEmail = lead.email && lead.email !== '';
  const shouldShowPhone = lead.phone && lead.phone !== '';
  const shouldShowCompany = lead.company && lead.company !== '';
  const shouldShowTags = lead.tags && lead.tags.length > 0;
  // ✅ Verificação robusta: garantir que dealValue existe, é um número válido e > 0
  const dealValueNum = typeof lead.dealValue === 'number' ? lead.dealValue : Number(lead.dealValue) || 0;
  const shouldShowDealValue = !isNaN(dealValueNum) && dealValueNum > 0;
  const shouldShowAssignee = lead.assignee && lead.assignee.name && lead.assignee.name !== 'Sem responsável';
  // ✅ Mostrar contador de emails apenas se existir e for maior que 0
  const emailCount = lead.activities?.emails ?? 0;
  const shouldShowEmailCount = emailCount > 0;
  const shouldShowPriority = lead.priority && lead.priority !== 'medium'; // Mostrar apenas se não for padrão

  const priorityData = priorityConfig[lead.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  return (
    <>
      <div
        className={`rounded-lg p-3 border transition-all duration-200 cursor-pointer group relative ${
          isDragging ? 'opacity-50 shadow-2xl' : ''
        } ${
          lead.isImportant
            ? isDark
              ? 'border-yellow-500/50 bg-[#0f0f0f]'
              : 'border-yellow-400/50 bg-yellow-50/30 shadow-md'
            : isDark
            ? 'bg-[#0f0f0f] border-white/[0.08] hover:border-white/[0.15]'
            : 'bg-white border-border-light hover:border-[#0169D9]/30 shadow-sm'
        } hover:shadow-lg`}
        onClick={onClick}
      >
        {/* ⭐ Importante - Ícone no canto superior direito */}
        {lead.isImportant && (
          <div className="absolute top-2 right-2 z-10">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          </div>
        )}

        {/* 🗑️ Botão de deletar - aparece ao passar o mouse */}
        {onDelete && !lead.isImportant && (
          <button
            onClick={handleDeleteClick}
            className={`absolute top-2 right-2 p-1.5 rounded-md z-10 transition-all duration-300 ease-in-out opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 ${
              isDark
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 backdrop-blur-sm'
                : 'bg-red-50 hover:bg-red-100 text-red-500'
            }`}
            title="Deletar lead"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 👤 Avatar + Nome do Cliente (SEMPRE visível) */}
        <div className="flex items-start gap-2 mb-2 pr-8">
          <Avatar
            name={lead.clientName || 'Sem nome'}
            imageUrl={lead.avatar || ''}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <h4
              className={`text-sm truncate ${
                lead.clientName === 'Sem nome'
                  ? isDark
                    ? 'text-white/50 italic'
                    : 'text-text-secondary-light italic'
                  : isDark
                  ? 'text-white'
                  : 'text-text-primary-light'
              }`}
            >
              {lead.clientName || 'Sem nome'}
            </h4>
            
            {/* 🏢 Empresa (apenas se não vazio) */}
            {shouldShowCompany && (
              <p
                className={`text-xs truncate ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                {lead.company}
              </p>
            )}
          </div>
        </div>

        {/* 📧 Email (apenas se existir) */}
        {shouldShowEmail && (
          <div
            className={`flex items-center gap-1.5 mb-2 text-xs ${
              isDark ? 'text-white/60' : 'text-text-secondary-light'
            }`}
          >
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate flex-1">{lead.email}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEmailCompose(lead.email);
              }}
              className={`p-1 rounded transition-all ${
                isDark 
                  ? 'hover:bg-blue-500/20 text-blue-400 hover:text-blue-300' 
                  : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'
              }`}
              title="Enviar e-mail"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 📱 Telefone (apenas se existir) */}
        {shouldShowPhone && (
          <div
            className={`flex items-center gap-1.5 mb-2 text-xs ${
              isDark ? 'text-white/60' : 'text-text-secondary-light'
            }`}
          >
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formatPhone(lead.phone)}</span>
          </div>
        )}

        {/* 🏷️ Prioridade + Tags */}
        {(shouldShowPriority || shouldShowTags) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {/* Prioridade (apenas se não for medium) */}
            {shouldShowPriority && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                  isDark
                    ? `${priorityData.bgLight} ${priorityData.textColor} border border-white/10`
                    : `${priorityData.bgLight} ${priorityData.textColor} border border-black/10`
                }`}
              >
                <span>{priorityData.icon}</span>
                <span>{priorityData.label}</span>
              </span>
            )}

            {/* Tags (apenas se houver) */}
            {shouldShowTags &&
              lead.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    isDark
                      ? 'text-white/60 bg-white/[0.05] border-white/[0.08]'
                      : 'text-text-secondary-light bg-light-elevated border-border-light'
                  }`}
                >
                  {tag}
                </span>
              ))}
          </div>
        )}

        {/* 👤 Pessoa Atribuída (apenas se existir) */}
        {shouldShowAssignee && (
          <div
            className={`flex items-center gap-1.5 mb-2 text-xs ${
              isDark ? 'text-white/60' : 'text-text-secondary-light'
            }`}
          >
            <Avatar
              name={lead.assignee!.name}
              imageUrl={lead.assignee!.avatar || ''}
              size="xs"
            />
            <span className="truncate">{lead.assignee!.name}</span>
          </div>
        )}

        {/* 💰 Valor do Negócio (apenas se > 0) */}
        {shouldShowDealValue && (
          <div
            className={`flex items-center gap-1.5 mb-2 text-xs ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}
          >
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formatCurrency(dealValueNum)}</span>
          </div>
        )}

        {/* 📊 Footer: Contador de Emails (apenas se > 0) */}
        {shouldShowEmailCount && (
          <div
            className={`flex items-center gap-2 pt-2 border-t ${
              isDark ? 'border-white/[0.05]' : 'border-border-light-elevated'
            }`}
          >
            <div
              className={`flex items-center gap-1 ${
                isDark ? 'text-white/40' : 'text-text-secondary-light'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="text-xs">{lead.activities.emails}</span>
            </div>
          </div>
        )}
      </div>

      {/* 🗑️ Delete Confirmation Dialog - FORA DO CARD */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={isDark ? 'bg-elevated border-white/[0.08]' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? 'text-white' : ''}>
              Deletar Lead?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-white/60' : ''}>
              Esta ação não pode ser desfeita. O lead <strong>{lead.clientName}</strong> será
              permanentemente deletado, incluindo todos os dados relacionados (custom fields,
              atividades e anexos).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : ''}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if lead data, isDragging state, or theme changes
export const KanbanCard = memo(KanbanCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.theme === nextProps.theme &&
    prevProps.lead.clientName === nextProps.lead.clientName &&
    prevProps.lead.company === nextProps.lead.company &&
    prevProps.lead.email === nextProps.lead.email &&
    prevProps.lead.phone === nextProps.lead.phone &&
    prevProps.lead.dealValue === nextProps.lead.dealValue &&
    prevProps.lead.priority === nextProps.lead.priority &&
    prevProps.lead.isImportant === nextProps.lead.isImportant &&
    prevProps.lead.tags.length === nextProps.lead.tags.length &&
    prevProps.lead.activities?.emails === nextProps.lead.activities?.emails &&
    prevProps.lead.avatar === nextProps.lead.avatar &&
    prevProps.lead.assignee?.name === nextProps.lead.assignee?.name
  );
});