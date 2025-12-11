import { CRMLead } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { Avatar } from './Avatar';

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
    if (!dueDate) return null;
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return null;
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Wrapper with horizontal scroll */}
      <div className="overflow-x-auto">
        <div className={`rounded-xl border overflow-hidden min-w-[800px] ${
          isDark 
            ? 'bg-elevated border-white/[0.05]' 
            : 'bg-white border-border-light shadow-sm'
        }`}>
          {/* Table Header */}
          <div className={`grid gap-4 px-4 py-3 border-b text-xs font-medium sticky top-0 z-10 ${
            isDark 
              ? 'border-white/[0.08] bg-true-black text-white/50' 
              : 'border-border-light bg-light-elevated text-text-secondary-light'
          }`} style={{ gridTemplateColumns: '40px minmax(200px, 2fr) minmax(150px, 1.5fr) 120px 140px 100px 1fr' }}>
            <div></div>
            <div>Contato</div>
            <div>Empresa</div>
            <div>Valor</div>
            <div>Status</div>
            <div>Vencimento</div>
            <div>Tags</div>
          </div>

          {/* Table Body */}
          <div className={isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light-elevated'}>
            {leads.map((lead, index) => {
              const daysUntilDue = getDaysUntilDue(lead.dueDate);
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
              const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

              return (
                <div
                  key={lead.id}
                  onClick={() => onLeadClick?.(lead)}
                  className={`grid gap-4 px-4 py-3 transition-colors cursor-pointer group text-sm items-center ${
                    isDark
                      ? `hover:bg-white/[0.02] ${index % 2 === 0 ? 'bg-true-black' : 'bg-elevated/50'}`
                      : `hover:bg-light-elevated ${index % 2 === 0 ? 'bg-white' : 'bg-light-elevated/50'}`
                  }`}
                  style={{ gridTemplateColumns: '40px minmax(200px, 2fr) minmax(150px, 1.5fr) 120px 140px 100px 1fr' }}
                >
                  {/* Avatar */}
                  <div className="flex items-center justify-center">
                    <Avatar
                      src={lead.avatar}
                      alt={lead.clientName}
                      size="sm"
                      className="w-8 h-8"
                    />
                  </div>

                  {/* Contact Name */}
                  <div className="flex flex-col min-w-0">
                    <div className={`truncate font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {lead.clientName}
                    </div>
                    {lead.notes && (
                      <div className={`truncate text-xs ${isDark ? 'text-white/30' : 'text-text-secondary-light/70'}`}>
                        {lead.notes}
                      </div>
                    )}
                  </div>

                  {/* Company */}
                  <div className={`truncate ${
                    isDark ? 'text-white/60' : 'text-text-secondary-light'
                  }`}>
                    {lead.company || '-'}
                  </div>

                  {/* Deal Value */}
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.dealValue)}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[lead.priority] || 'bg-gray-400'}`} />
                    <span className={`truncate text-xs capitalize ${isDark ? 'text-white/60' : 'text-text-secondary-light'}`}>
                      {statusLabels[lead.status as keyof typeof statusLabels] || lead.status}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div>
                    {lead.dueDate ? (
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          isOverdue
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : isDueSoon
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            : isDark
                            ? 'bg-white/5 text-white/50 border-white/10'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {new Date(lead.dueDate).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>-</span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 max-h-[32px] overflow-hidden">
                    {lead.tags && lead.tags.length > 0 ? (
                      lead.tags.map((tag, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded border text-[10px] whitespace-nowrap ${
                            isDark
                              ? 'bg-white/[0.05] border-white/[0.08] text-white/50'
                              : 'bg-light-elevated border-border-light text-text-secondary-light'
                          }`}
                          title={tag}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>-</span>
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