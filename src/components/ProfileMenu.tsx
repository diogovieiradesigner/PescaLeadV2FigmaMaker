import { useState, useRef, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Settings, ChevronDown, Building2 } from 'lucide-react';
import { ProfileModal } from './ProfileModal';

interface ProfileMenuProps {
  theme: Theme;
  onNavigateToSettings?: () => void;
}

export function ProfileMenu({ theme, onNavigateToSettings }: ProfileMenuProps) {
  const isDark = theme === 'dark';
  const { user, currentWorkspace, workspaces, logout, switchWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowWorkspaces(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Get user initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(user.name);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId);
      setShowWorkspaces(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Switch workspace error:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
          isDark
            ? 'hover:bg-white/[0.05]'
            : 'hover:bg-black/[0.05]'
        }`}
      >
        {/* Avatar with Initials */}
        <div className="w-8 h-8 rounded-full bg-[#0169D9] flex items-center justify-center">
          <span className="text-white text-sm font-medium">{initials}</span>
        </div>

        {/* User Info */}
        <div className="hidden md:flex flex-col items-start">
          <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            {user.name}
          </span>
          {currentWorkspace && (
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
              {currentWorkspace.name}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 transition-transform ${
          isOpen ? 'rotate-180' : ''
        } ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-64 rounded-lg border shadow-lg overflow-hidden z-50 ${
          isDark
            ? 'bg-elevated border-white/[0.08]'
            : 'bg-white border-border-light'
        }`}>
          {/* User Info Section */}
          <div className={`px-4 py-3 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0169D9] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  {user.name}
                </p>
                <p className={`text-xs truncate ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Current Workspace */}
          {currentWorkspace && (
            <div className={`px-4 py-2 border-b ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <button
                onClick={() => setShowWorkspaces(!showWorkspaces)}
                className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className={`w-4 h-4 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                  <div className="flex flex-col items-start">
                    <span className={`text-xs ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      Workspace atual
                    </span>
                    <span className={`text-sm ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      {currentWorkspace.name}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  showWorkspaces ? 'rotate-180' : ''
                } ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
              </button>

              {/* Workspaces List */}
              {showWorkspaces && (
                <div className="mt-2 space-y-1">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => handleSwitchWorkspace(workspace.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        workspace.id === currentWorkspace.id
                          ? isDark
                            ? 'bg-[#0169D9]/10 text-[#0169D9]'
                            : 'bg-[#0169D9]/10 text-[#0169D9]'
                          : isDark
                            ? 'text-white/70 hover:bg-white/[0.05]'
                            : 'text-text-secondary-light hover:bg-black/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{workspace.name}</span>
                        {workspace.role && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-white/10' : 'bg-black/10'
                          }`}>
                            {workspace.role}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Menu Options */}
          <div className="py-2">
            <button
              onClick={() => {
                setShowProfileModal(true);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${
                isDark
                  ? 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                  : 'text-text-secondary-light hover:bg-black/[0.05] hover:text-text-primary-light'
              }`}
            >
              <User className="w-4 h-4" />
              Meu perfil
            </button>

            <button
              onClick={() => {
                if (onNavigateToSettings) {
                  onNavigateToSettings();
                  setIsOpen(false);
                }
              }}
              disabled={!onNavigateToSettings}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${
                !onNavigateToSettings
                  ? isDark
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-text-secondary-light/30 cursor-not-allowed'
                  : isDark
                    ? 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                    : 'text-text-secondary-light hover:bg-black/[0.05] hover:text-text-primary-light'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
          </div>

          {/* Logout */}
          <div className={`border-t ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <button
              onClick={handleLogout}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                isDark
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        theme={theme}
      />
    </div>
  );
}