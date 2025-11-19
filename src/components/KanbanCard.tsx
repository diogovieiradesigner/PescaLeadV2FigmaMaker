import { Phone, Mail, Calendar } from 'lucide-react';
import { CRMLead } from '../types/crm';
import { Theme } from '../hooks/useTheme';

interface KanbanCardProps {
  lead: CRMLead;
  isDragging: boolean;
  theme: Theme;
  onClick?: () => void;
}

const priorityColors = {
  high: 'bg-[#0169D9]',
  medium: 'bg-white/30',
  low: 'bg-white/10',
};

export function KanbanCard({ lead, isDragging, theme, onClick }: KanbanCardProps) {
  const isDark = theme === 'dark';
  
  const getDaysUntilDue = () => {
    const due = new Date(lead.dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <div
      className={`rounded-lg p-3 border transition-all duration-200 cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${
        isDark
          ? 'bg-elevated border-white/[0.08] hover:border-white/[0.15]'
          : 'bg-white border-border-light hover:border-[#0169D9]/30 shadow-sm'
      }`}
      onClick={onClick}
    >
      {/* Header with Avatar and Priority */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={lead.avatar}
            alt={lead.clientName}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
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
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${priorityColors[lead.priority]}`} />
      </div>

      {/* Deal Value */}
      <div className="mb-2">
        <div className={`text-sm ${
          isDark ? 'text-white' : 'text-text-primary-light'
        }`}>
          ${lead.dealValue.toLocaleString()}
        </div>
      </div>

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
  );
}
