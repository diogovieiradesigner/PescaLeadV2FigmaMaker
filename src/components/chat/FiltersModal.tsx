import { X } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { DbUser } from '../../types/database-chat';
import { Inbox } from '../SettingsView';

export interface FiltersState {
  assignees: string[];
  inboxes: string[];
  statuses: string[];
  attendantTypes: string[];
}

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  agents: DbUser[];
  inboxes: Inbox[];
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

export function FiltersModal({
  isOpen,
  onClose,
  theme,
  agents,
  inboxes,
  filters,
  onFiltersChange,
}: FiltersModalProps) {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleAssigneeToggle = (assigneeId: string) => {
    console.log('🔵 handleAssigneeToggle chamado com:', assigneeId);
    console.log('🔵 Filtros atuais:', filters);
    
    if (assigneeId === 'all') {
      // Se "Tudo" já está marcado, desmarcar e permitir seleções individuais
      if (filters.assignees.includes('all')) {
        onFiltersChange({ ...filters, assignees: [] });
      } else {
        // Se "Tudo" não está marcado, marcar e limpar seleções individuais
        onFiltersChange({ ...filters, assignees: ['all'] });
      }
    } else {
      // Remover "all" se estiver presente
      let newAssignees = filters.assignees.filter(a => a !== 'all');
      const index = newAssignees.indexOf(assigneeId);
      
      if (index > -1) {
        // Desmarcar este item
        newAssignees.splice(index, 1);
      } else {
        // Marcar este item
        newAssignees.push(assigneeId);
      }

      // Se nenhum filtro estiver selecionado, voltar para "Tudo"
      if (newAssignees.length === 0) {
        newAssignees = ['all'];
      }

      onFiltersChange({ ...filters, assignees: newAssignees });
    }
    
    console.log('🔵 Novos filtros enviados');
  };

  const handleInboxToggle = (inboxId: string) => {
    if (inboxId === 'all') {
      if (filters.inboxes.includes('all')) {
        onFiltersChange({ ...filters, inboxes: [] });
      } else {
        onFiltersChange({ ...filters, inboxes: ['all'] });
      }
    } else {
      let newInboxes = filters.inboxes.filter(i => i !== 'all');
      const index = newInboxes.indexOf(inboxId);
      
      if (index > -1) {
        newInboxes.splice(index, 1);
      } else {
        newInboxes.push(inboxId);
      }

      if (newInboxes.length === 0) {
        newInboxes = ['all'];
      }

      onFiltersChange({ ...filters, inboxes: newInboxes });
    }
  };

  const handleStatusToggle = (status: string) => {
    if (status === 'all') {
      if (filters.statuses.includes('all')) {
        onFiltersChange({ ...filters, statuses: [] });
      } else {
        onFiltersChange({ ...filters, statuses: ['all'] });
      }
    } else {
      let newStatuses = filters.statuses.filter(s => s !== 'all');
      const index = newStatuses.indexOf(status);
      
      if (index > -1) {
        newStatuses.splice(index, 1);
      } else {
        newStatuses.push(status);
      }

      if (newStatuses.length === 0) {
        newStatuses = ['all'];
      }

      onFiltersChange({ ...filters, statuses: newStatuses });
    }
  };

  const handleAttendantTypeToggle = (type: string) => {
    if (type === 'all') {
      if (filters.attendantTypes.includes('all')) {
        onFiltersChange({ ...filters, attendantTypes: [] });
      } else {
        onFiltersChange({ ...filters, attendantTypes: ['all'] });
      }
    } else {
      let newTypes = filters.attendantTypes.filter(t => t !== 'all');
      const index = newTypes.indexOf(type);
      
      if (index > -1) {
        newTypes.splice(index, 1);
      } else {
        newTypes.push(type);
      }

      if (newTypes.length === 0) {
        newTypes = ['all'];
      }

      onFiltersChange({ ...filters, attendantTypes: newTypes });
    }
  };

  const handleClearAll = () => {
    onFiltersChange({
      assignees: ['all'],
      inboxes: ['all'],
      statuses: ['all'],
      attendantTypes: ['all'],
    });
  };

  const statusOptions = [
    { value: 'all', label: 'Tudo' },
    { value: 'waiting', label: 'Aguardando' },
    { value: 'in-progress', label: 'Em Atendimento' },
    { value: 'resolved', label: 'Resolvido' },
  ];

  const attendantTypeOptions = [
    { value: 'all', label: 'Tudo' },
    { value: 'human', label: 'Humano' },
    { value: 'ai', label: 'I.A' },
  ];

  const hasActiveFilters = 
    !filters.assignees.includes('all') ||
    !filters.inboxes.includes('all') ||
    !filters.statuses.includes('all') ||
    !filters.attendantTypes.includes('all');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-elevated' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <h2 className={`text-lg ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Filtros
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
            }`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Atendentes */}
            <div>
              <h3 className={`mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Atendentes
              </h3>
              <div className="space-y-2">
                <label 
                  onClick={(e) => {
                    console.log('🟢 LABEL CLICADO - Tudo');
                    e.stopPropagation();
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filters.assignees.includes('all')}
                    onChange={(e) => {
                      console.log('🟡 CHECKBOX CHANGED - Tudo', e.target.checked);
                      handleAssigneeToggle('all');
                    }}
                    className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer"
                  />
                  <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                    Tudo
                  </span>
                </label>

                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                } ${filters.assignees.includes('all') ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={filters.assignees.includes('unassigned')}
                    onChange={() => handleAssigneeToggle('unassigned')}
                    disabled={filters.assignees.includes('all')}
                    className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    Não atribuído
                  </span>
                </label>

                {agents.map(agent => (
                  <label 
                    key={agent.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                    } ${filters.assignees.includes('all') ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.assignees.includes(agent.id)}
                      onChange={() => handleAssigneeToggle(agent.id)}
                      disabled={filters.assignees.includes('all')}
                      className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                      {agent.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Caixas de Entrada */}
            <div>
              <h3 className={`mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Caixas de Entrada
              </h3>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                }`}>
                  <input
                    type="checkbox"
                    checked={filters.inboxes.includes('all')}
                    onChange={() => handleInboxToggle('all')}
                    className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer"
                  />
                  <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                    Tudo
                  </span>
                </label>

                {inboxes.map(inbox => (
                  <label 
                    key={inbox.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                    } ${filters.inboxes.includes('all') ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.inboxes.includes(inbox.id)}
                      onChange={() => handleInboxToggle(inbox.id)}
                      disabled={filters.inboxes.includes('all')}
                      className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                      {inbox.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className={`mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Status da Conversa
              </h3>
              <div className="space-y-2">
                {statusOptions.map(option => (
                  <label 
                    key={option.value}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                    } ${option.value !== 'all' && filters.statuses.includes('all') ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(option.value)}
                      onChange={() => handleStatusToggle(option.value)}
                      disabled={option.value !== 'all' && filters.statuses.includes('all')}
                      className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tipo de Atendimento */}
            <div>
              <h3 className={`mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Tipo de Atendimento
              </h3>
              <div className="space-y-2">
                {attendantTypeOptions.map(option => (
                  <label 
                    key={option.value}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                    } ${option.value !== 'all' && filters.attendantTypes.includes('all') ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={filters.attendantTypes.includes(option.value)}
                      onChange={() => handleAttendantTypeToggle(option.value)}
                      disabled={option.value !== 'all' && filters.attendantTypes.includes('all')}
                      className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isDark 
                  ? 'text-white/70 hover:bg-white/[0.05]' 
                  : 'text-text-secondary-light hover:bg-light-elevated-hover'
              }`}
            >
              Limpar Filtros
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm bg-[#0169D9] text-white hover:bg-[#0184F5] transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}