import { useState, useRef, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Check, ChevronDown, Plus, Loader2 } from 'lucide-react';

interface WorkspaceSwitcherProps {
  theme: Theme;
}

export function WorkspaceSwitcher({ theme }: WorkspaceSwitcherProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace, workspaces, switchWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (workspaceId: string) => {
    if (workspaceId === currentWorkspace?.id || isSwitching) return;

    try {
      setIsSwitching(true);
      await switchWorkspace(workspaceId);
      setIsOpen(false);
      // Reload page to reset state
      window.location.reload();
    } catch (error: any) {
      console.error('Switch workspace error:', error);
      alert('Erro ao trocar de workspace: ' + error.message);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!currentWorkspace) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isDark
            ? 'hover:bg-white/[0.05] text-white'
            : 'hover:bg-black/[0.05] text-text-primary-light'
        }`}
        disabled={isSwitching}
      >
        <div className={`w-8 h-8 rounded-lg bg-[#0169D9] flex items-center justify-center flex-shrink-0`}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={`text-sm font-medium truncate ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            {currentWorkspace.name}
          </p>
          <p className={`text-xs truncate ${
            isDark ? 'text-white/50' : 'text-text-secondary-light'
          }`}>
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isSwitching ? (
          <Loader2 className={`w-4 h-4 animate-spin flex-shrink-0 ${
            isDark ? 'text-white/70' : 'text-text-secondary-light'
          }`} />
        ) : (
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-72 rounded-xl shadow-xl border overflow-hidden z-50 ${
          isDark
            ? 'bg-elevated border-white/[0.08]'
            : 'bg-white border-border-light'
        }`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <p className={`text-xs font-medium ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              MEUS WORKSPACES
            </p>
          </div>

          {/* Workspace List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSwitch(workspace.id)}
                disabled={isSwitching}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                  workspace.id === currentWorkspace.id
                    ? isDark
                      ? 'bg-[#0169D9]/10'
                      : 'bg-[#0169D9]/5'
                    : isDark
                      ? 'hover:bg-white/[0.05]'
                      : 'hover:bg-black/[0.02]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  workspace.id === currentWorkspace.id
                    ? 'bg-[#0169D9]'
                    : isDark
                      ? 'bg-white/[0.08]'
                      : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-5 h-5 ${
                    workspace.id === currentWorkspace.id
                      ? 'text-white'
                      : isDark
                        ? 'text-white/70'
                        : 'text-text-secondary-light'
                  }`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    isDark ? 'text-white' : 'text-text-primary-light'
                  }`}>
                    {workspace.name}
                  </p>
                  <p className={`text-xs truncate ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    {workspace.role}
                  </p>
                </div>
                {workspace.id === currentWorkspace.id && (
                  <Check className="w-5 h-5 text-[#0169D9] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Create New Workspace */}
          <div className={`border-t ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <button
              onClick={() => {
                setIsOpen(false);
                // Trigger create workspace modal
                window.dispatchEvent(new CustomEvent('open-create-workspace'));
              }}
              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white/70 hover:text-white'
                  : 'hover:bg-black/[0.02] text-text-secondary-light hover:text-text-primary-light'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
              }`}>
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Criar novo workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
