import { Phone, Mail, Calendar, Trash2, Globe } from 'lucide-react';
import { CRMLead } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { memo, useState } from 'react';
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

const priorityColors = {
  high: 'bg-[#0169D9]',
  medium: 'bg-white/30',
  low: 'bg-white/10',
};

function KanbanCardComponent({ lead, isDragging, theme, onClick, onDelete }: KanbanCardProps) {
  const isDark = theme === 'dark';
  
  const getDaysUntilDue = () => {
    if (!lead.dueDate) return null;
    const due = new Date(lead.dueDate);
    if (isNaN(due.getTime())) return null;
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // ✅ Previne propagação do evento para o card
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(false);
    onDelete?.(lead.id);
  };

  const { displayPhone, displayWebsite } = (() => {
    let phone: string | null = null;
    let website: string | null = null;

    // Debug: ver o que está chegando
    console.log('[KanbanCard] Custom fields para lead', lead.clientName, ':', lead.customFields);

    if (lead.customFields) {
      for (const field of lead.customFields) {
        if (!field.fieldValue) continue;
        const name = field.fieldName.toLowerCase();
        const val = field.fieldValue.trim();

        // Find Phone
        if (!phone && (field.fieldType === 'phone' || name.includes('telefone') || name.includes('celular') || name.includes('whatsapp'))) {
          if (val.startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                phone = parsed[0].with_country || parsed[0].number || parsed[0].formatted;
              }
            } catch {}
          } else {
            phone = val;
          }
        }

        // Find Website
        if (!website && (field.fieldType === 'url' || name.includes('site') || name.includes('website'))) {
          if (val.startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                website = parsed[0].url;
              }
            } catch {}
          } else {
            website = val;
          }
        }
      }
    }
    return { displayPhone: phone, displayWebsite: website };
  })();

  return (
    <>
      <div
        className={`rounded-lg p-3 border transition-all duration-200 cursor-pointer group relative ${
          isDragging ? 'opacity-50' : ''
        } ${
          isDark
            ? 'bg-elevated border-white/[0.08] hover:border-white/[0.15]'
            : 'bg-white border-border-light hover:border-[#0169D9]/30 shadow-sm'
        }`}
        onClick={onClick}
      >
        {/* Botão de deletar - aparece ao passar o mouse */}
        {onDelete && (
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

        {/* Header with Avatar and Priority */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-8">
            <Avatar
              name={lead.clientName}
              imageUrl={lead.avatar}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <h4 className={`text-sm truncate ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                {lead.clientName}
              </h4>
              <p className={`text-xs truncate ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                {lead.company}
              </p>
            </div>
          </div>
          
          {/* Priority Indicator */}
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${priorityColors[lead.priority]}`} />
        </div>

        {/* Contact Info from Custom Fields */}
        {(displayPhone || displayWebsite) && (
          <div className="mb-2 space-y-1">
            {displayPhone && (
              <div className={`flex items-center gap-1.5 text-xs ${
                isDark ? 'text-white/60' : 'text-text-secondary-light'
              }`}>
                <Phone className="w-3 h-3" />
                <span className="truncate">{displayPhone}</span>
              </div>
            )}
            {displayWebsite && (
              <div className={`flex items-center gap-1.5 text-xs ${
                isDark ? 'text-white/60' : 'text-text-secondary-light'
              }`}>
                <Globe className="w-3 h-3" />
                <span className="truncate">{displayWebsite}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {lead.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className={`px-1.5 py-0.5 rounded text-xs border ${
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

        {/* Due Date */}
        {daysUntilDue !== null && lead.dueDate && (
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className={`w-3.5 h-3.5 ${
              isDark ? 'text-white/40' : 'text-text-secondary-light'
            }`} />
            <span
              className={`text-xs ${
                isOverdue
                  ? 'text-red-400'
                  : isDueSoon
                  ? 'text-yellow-400'
                  : isDark
                  ? 'text-white/50'
                  : 'text-text-secondary-light'
              }`}
            >
              {new Date(lead.dueDate).toLocaleDateString('pt-BR', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Footer with Phone and Email count */}
        <div className={`flex items-center gap-2 pt-2 border-t ${
          isDark ? 'border-white/[0.05]' : 'border-border-light-elevated'
        }`}>
          {lead.activities.calls > 0 && (
            <div className={`flex items-center gap-1 ${
              isDark ? 'text-white/40' : 'text-text-secondary-light'
            }`}>
              <Phone className="w-3.5 h-3.5" />
              <span className="text-xs">{lead.activities.calls}</span>
            </div>
          )}
          {lead.activities.emails > 0 && (
            <div className={`flex items-center gap-1 ${
              isDark ? 'text-white/40' : 'text-text-secondary-light'
            }`}>
              <Mail className="w-3.5 h-3.5" />
              <span className="text-xs">{lead.activities.emails}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog - FORA DO CARD */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={isDark ? 'bg-elevated border-white/[0.08]' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDark ? 'text-white' : ''}>
              Deletar Lead?
            </AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-white/60' : ''}>
              Esta ação não pode ser desfeita. O lead <strong>{lead.clientName}</strong> será permanentemente deletado, incluindo todos os dados relacionados (custom fields, atividades e anexos).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : ''}>
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
    prevProps.lead.dealValue === nextProps.lead.dealValue &&
    prevProps.lead.priority === nextProps.lead.priority &&
    prevProps.lead.dueDate === nextProps.lead.dueDate &&
    prevProps.lead.tags.length === nextProps.lead.tags.length &&
    prevProps.lead.activities.calls === nextProps.lead.activities.calls &&
    prevProps.lead.activities.emails === nextProps.lead.activities.emails &&
    prevProps.lead.avatar === nextProps.lead.avatar &&
    prevProps.lead.customFields?.length === nextProps.lead.customFields?.length
  );
});