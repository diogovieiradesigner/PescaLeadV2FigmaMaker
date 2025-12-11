import { Theme } from '../../hooks/useTheme';
import { DbUser } from '../../types/database-chat';
import { Inbox } from '../SettingsView';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ConversationFiltersState {
  assignees: string[];
  inboxes: string[];
  statuses: string[];
  attendantTypes: string[];
  extractions: string[]; // IDs das extrações ou 'all', 'none' (sem extração)
}

export interface LeadExtraction {
  id: string;
  extraction_name: string;
}

interface ConversationFiltersProps {
  theme: Theme;
  agents: DbUser[];
  inboxes: Inbox[];
  extractions: LeadExtraction[];
  filters: ConversationFiltersState;
  onFiltersChange: (filters: ConversationFiltersState) => void;
}

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  theme: Theme;
}

function FilterDropdown({ label, options, selectedValues, onToggle, theme }: FilterDropdownProps) {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedCount = selectedValues.includes('all') ? 0 : selectedValues.length;
  const displayText = selectedCount === 0 ? label : `${label} (${selectedCount})`;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
          selectedCount > 0
            ? 'bg-[#0169D9]/10 text-[#0169D9] border border-[#0169D9]/20'
            : isDark
            ? 'bg-white/[0.05] text-white/70 border border-white/[0.08] hover:bg-white/[0.08]'
            : 'bg-light-elevated text-text-secondary-light border border-border-light hover:bg-light-elevated-hover'
        }`}
      >
        {displayText}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 9999,
            }}
            className={`min-w-[180px] rounded-lg shadow-2xl border ${
              isDark ? 'bg-[#1a1a1a] border-white/[0.08]' : 'bg-white border-border-light'
            }`}
          >
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                  } ${option.value !== 'all' && selectedValues.includes('all') ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => onToggle(option.value)}
                    disabled={option.value !== 'all' && selectedValues.includes('all')}
                    className="w-4 h-4 rounded border-2 accent-[#0169D9] cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function ConversationFilters({
  theme,
  agents,
  inboxes,
  extractions,
  filters,
  onFiltersChange,
}: ConversationFiltersProps) {
  const isDark = theme === 'dark';

  const handleAssigneeToggle = (assigneeId: string) => {
    if (assigneeId === 'all') {
      if (filters.assignees.includes('all')) {
        onFiltersChange({ ...filters, assignees: [] });
      } else {
        onFiltersChange({ ...filters, assignees: ['all'] });
      }
    } else {
      let newAssignees = filters.assignees.filter(a => a !== 'all');
      const index = newAssignees.indexOf(assigneeId);
      
      if (index > -1) {
        newAssignees.splice(index, 1);
      } else {
        newAssignees.push(assigneeId);
      }

      if (newAssignees.length === 0) {
        newAssignees = ['all'];
      }

      onFiltersChange({ ...filters, assignees: newAssignees });
    }
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

  const handleExtractionToggle = (extractionId: string) => {
    if (extractionId === 'all') {
      if (filters.extractions.includes('all')) {
        onFiltersChange({ ...filters, extractions: [] });
      } else {
        onFiltersChange({ ...filters, extractions: ['all'] });
      }
    } else {
      let newExtractions = filters.extractions.filter(e => e !== 'all');
      const index = newExtractions.indexOf(extractionId);

      if (index > -1) {
        newExtractions.splice(index, 1);
      } else {
        newExtractions.push(extractionId);
      }

      if (newExtractions.length === 0) {
        newExtractions = ['all'];
      }

      onFiltersChange({ ...filters, extractions: newExtractions });
    }
  };

  const assigneeOptions = [
    { value: 'all', label: 'Tudo' },
    { value: 'unassigned', label: 'Não atribuído' },
    ...agents.map(agent => ({ value: agent.id, label: agent.name })),
  ];

  const inboxOptions = [
    { value: 'all', label: 'Tudo' },
    ...inboxes.map(inbox => ({ value: inbox.id, label: inbox.name })),
  ];

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

  const extractionOptions = [
    { value: 'all', label: 'Tudo' },
    { value: 'none', label: 'Sem extração' },
    ...extractions.map(ext => ({ value: ext.id, label: ext.extraction_name })),
  ];

  return (
    <div
      className={`border-b ${
        isDark ? 'border-white/[0.08]' : 'border-border-light'
      }`}
    >
      <div 
        className="px-4 py-2 overflow-x-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: isDark ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.2) transparent',
        }}
      >
        <style>
          {`
            .filters-scroll-container::-webkit-scrollbar {
              height: 6px;
            }
            .filters-scroll-container::-webkit-scrollbar-track {
              background: transparent;
            }
            .filters-scroll-container::-webkit-scrollbar-thumb {
              background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
              border-radius: 3px;
            }
            .filters-scroll-container::-webkit-scrollbar-thumb:hover {
              background: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'};
            }
          `}
        </style>
        <div className="flex items-center gap-2 filters-scroll-container min-w-max">
          <FilterDropdown
            label="Atendente"
            options={assigneeOptions}
            selectedValues={filters.assignees}
            onToggle={handleAssigneeToggle}
            theme={theme}
          />
          <FilterDropdown
            label="Caixa"
            options={inboxOptions}
            selectedValues={filters.inboxes}
            onToggle={handleInboxToggle}
            theme={theme}
          />
          <FilterDropdown
            label="Status"
            options={statusOptions}
            selectedValues={filters.statuses}
            onToggle={handleStatusToggle}
            theme={theme}
          />
          <FilterDropdown
            label="Tipo"
            options={attendantTypeOptions}
            selectedValues={filters.attendantTypes}
            onToggle={handleAttendantTypeToggle}
            theme={theme}
          />
          <FilterDropdown
            label="Extração"
            options={extractionOptions}
            selectedValues={filters.extractions}
            onToggle={handleExtractionToggle}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}