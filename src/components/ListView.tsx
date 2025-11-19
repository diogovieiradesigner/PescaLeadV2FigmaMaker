import { CRMLead } from '../types/crm';
import { Phone, Mail } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface ListViewProps {
  leads: CRMLead[];
  theme: Theme;
  onLeadClick?: (lead: CRMLead) => void;
}

const priorityColors = {
  high: 'bg-[#0169D9]',
  medium: 'bg-white/30',
  low: 'bg-white/10',
};

const statusLabels = {
  new: 'Novo',
  contacted: 'Contactado',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
};

export function ListView({ leads, theme, onLeadClick }: ListViewProps) {
  const isDark = theme === 'dark';

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Wrapper with horizontal scroll */}
      <div className="overflow-x-auto">
        <div className={`rounded-xl border overflow-hidden min-w-[1000px] ${
          isDark 
            ? 'bg-elevated border-white/[0.05]' 
            : 'bg-white border-border-light shadow-sm'
        }`}>
          {/* Table Header */}
          <div className={`grid gap-3 px-4 py-2.5 border-b text-xs ${
            isDark 
              ? 'border-white/[0.08] bg-true-black text-white/50' 
              : 'border-border-light bg-light-elevated text-text-secondary-light'
          }`} style={{ gridTemplateColumns: '50px 200px 140px 100px 130px 90px 80px 100px 60px' }}>
            <div></div>
            <div>Contato</div>
            <div>Empresa</div>
            <div>Valor</div>
            <div>Status</div>
            <div>Vencimento</div>
            <div>Telefone</div>
            <div>Email</div>
            <div>Tags</div>
          </div>

          {/* Table Body */}
          <div className={isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light-elevated'}>
            {leads.map((lead, index) => {
              const daysUntilDue = getDaysUntilDue(lead.dueDate);
              const isOverdue = daysUntilDue < 0;
              const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

              return (
                <div
                  key={lead.id}
                  onClick={() => onLeadClick?.(lead)}
                  className={`grid gap-3 px-4 py-2.5 transition-colors cursor-pointer group text-sm ${
                    isDark
                      ? `hover:bg-white/[0.02] ${index % 2 === 0 ? 'bg-true-black' : 'bg-elevated/50'}`
                      : `hover:bg-light-elevated ${index % 2 === 0 ? 'bg-white' : 'bg-light-elevated/50'}`
                  }`}
                  style={{ gridTemplateColumns: '50px 200px 140px 100px 130px 90px 80px 100px 60px' }}
                >
                  {/* Avatar */}
                  <div className="flex items-center">
                    <img
                      src={lead.avatar}
                      alt={lead.clientName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </div>

                  {/* Contact Name */}
                  <div className="flex items-center">
                    <div className={`truncate ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {lead.clientName}
                    </div>
                  </div>

                  {/* Company */}
                  <div className={`flex items-center truncate ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    {lead.company}
                  </div>

                  {/* Deal Value */}
                  <div className="flex items-center">
                    <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                      ${lead.dealValue.toLocaleString()}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityColors[lead.priority]}`} />
                    <span className={`truncate text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      {statusLabels[lead.status as keyof typeof statusLabels]}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center">
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

                  {/* Phone */}
                  <div className="flex items-center gap-1.5">
                    {lead.activities.calls > 0 && (
                      <>
                        <Phone className={`w-3.5 h-3.5 ${
                          isDark ? 'text-white/40' : 'text-text-secondary-light'
                        }`} />
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                          {lead.activities.calls}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5">
                    {lead.activities.emails > 0 && (
                      <>
                        <Mail className={`w-3.5 h-3.5 ${
                          isDark ? 'text-white/40' : 'text-text-secondary-light'
                        }`} />
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                          {lead.activities.emails}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1">
                    {lead.tags.slice(0, 1).map((tag, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded border text-xs truncate max-w-[60px] ${
                          isDark
                            ? 'bg-white/[0.05] border-white/[0.08] text-white/50'
                            : 'bg-light-elevated border-border-light text-text-secondary-light'
                        }`}
                        title={tag}
                      >
                        {tag}
                      </span>
                    ))}
                    {lead.tags.length > 1 && (
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                        +{lead.tags.length - 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {leads.length === 0 && (
        <div className={`text-center py-12 ${
          isDark ? 'text-white/20' : 'text-text-secondary-light'
        }`}>
          Nenhum lead encontrado
        </div>
      )}
    </div>
  );
}
