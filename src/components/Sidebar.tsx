import { Home, Target, MessageSquare, ChevronLeft, ChevronRight, Download, Megaphone, Bot, Calendar, FileText, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import { Theme } from '../hooks/useTheme';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import IconografiaPescaLead from '../imports/IconografiaPescaLead';
import LogoPescaLeadBranca from '../imports/LogoPescaLeadBranca';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  theme: Theme;
  currentView: string;
  onViewChange: (view: string) => void;
}

// Mapeamento de view para URL path (sincronizado com useNavigation.ts)
const VIEW_TO_PATH: Record<string, string> = {
  'dashboard': '/dashboard',
  'pipeline': '/pipeline',
  'chat': '/chat',
  'extraction': '/extracao',
  'campaign': '/campanhas',
  'ai-service': '/ia',
  'calendar': '/calendario',
  'documents': '/documentos',
  'ai-assistant': '/assistente-ia',
};

const navItems = [
  { icon: Home, label: 'Dashboard', active: false, view: 'dashboard' },
  { icon: Target, label: 'Pipeline', active: true, view: 'pipeline' },
  { icon: MessageSquare, label: 'Chat', active: false, view: 'chat' },
  { icon: Download, label: 'Extração', active: false, view: 'extraction' },
  { icon: Megaphone, label: 'Campanha', active: false, view: 'campaign' },
  { icon: Bot, label: 'Atendimento de I.A', active: false, view: 'ai-service' },
  { icon: Calendar, label: 'Calendário', active: false, view: 'calendar' },
  { icon: FileText, label: 'Documentos', active: false, view: 'documents' },
  { icon: BrainCircuit, label: 'Assistente IA', active: false, view: 'ai-assistant' },
];

export function Sidebar({ isCollapsed, onToggle, theme, currentView, onViewChange }: SidebarProps) {
  const isDark = theme === 'dark';
  const { hasPageAccess } = useAuth();

  // Filter nav items based on page access
  const visibleNavItems = navItems.filter(item => hasPageAccess(item.view));

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`hidden md:flex h-screen border-r flex-col relative z-20 transition-colors ${
        isDark 
          ? 'bg-true-black border-white/[0.08]' 
          : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center justify-between px-6 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-border-light'
      }`}>
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-start pl-1"
          >
            <div className={`h-8 w-40 relative ${!isDark ? '[&_p]:!text-[#0F172A]' : ''}`}>
              <LogoPescaLeadBranca />
            </div>
          </motion.div>
        ) : (
          <div className="w-8 h-8">
            <IconografiaPescaLead />
          </div>
        )}
        
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark 
              ? 'hover:bg-white/[0.05] text-white/50 hover:text-white/70' 
              : 'hover:bg-light-elevated-hover text-text-secondary-light hover:text-text-primary-light'
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleNavItems.map((item) => (
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
            onAuxClick={(e) => {
              // Middle-click (scroll button) - abre em nova aba
              if (e.button === 1) {
                e.preventDefault();
                const path = VIEW_TO_PATH[item.view] || `/${item.view}`;
                window.open(path, '_blank');
              }
            }}
          >
            {currentView === item.view && (
              <motion.div 
                layoutId="activeIndicator"
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0169D9] rounded-r" 
              />
            )}
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>
    </motion.aside>
  );
}