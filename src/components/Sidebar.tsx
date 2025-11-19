import { Home, Target, Settings, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { Theme } from '../hooks/useTheme';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  theme: Theme;
  currentView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { icon: Home, label: 'Dashboard', active: false, view: 'dashboard' },
  { icon: Target, label: 'Pipeline', active: true, view: 'pipeline' },
  { icon: MessageSquare, label: 'Chat', active: false, view: 'chat' },
  { icon: Settings, label: 'Configurações', active: false, view: 'settings' },
];

export function Sidebar({ isCollapsed, onToggle, theme, currentView, onViewChange }: SidebarProps) {
  const isDark = theme === 'dark';
  
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`h-screen border-r flex flex-col relative z-20 transition-colors ${
        isDark 
          ? 'bg-true-black border-white/[0.08]' 
          : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center px-6 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-border-light'
      }`}>
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0169D9] flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className={isDark ? 'text-white' : 'text-text-primary-light'}>
              CRM Pro
            </span>
          </motion.div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#0169D9] flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${
              currentView === item.view
                ? isDark
                  ? 'bg-white/[0.05] text-white'
                  : 'bg-light-elevated text-text-primary-light'
                : isDark
                ? 'text-white/50 hover:bg-white/[0.03] hover:text-white/70'
                : 'text-text-secondary-light hover:bg-light-elevated-hover hover:text-text-primary-light'
            }`}
            onClick={() => onViewChange(item.view)}
          >
            {currentView === item.view && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0169D9] rounded-r" />
            )}
            <item.icon className="w-5 h-5" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`absolute -right-3 top-20 w-6 h-6 border rounded-full flex items-center justify-center transition-colors z-10 ${
          isDark
            ? 'bg-elevated border-white/[0.08] hover:bg-white/[0.05]'
            : 'bg-light-elevated border-border-light hover:bg-light-elevated-hover'
        }`}
      >
        {isCollapsed ? (
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`} />
        ) : (
          <ChevronLeft className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`} />
        )}
      </button>
    </motion.aside>
  );
}