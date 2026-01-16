import { Home, Target, MessageSquare, Download, Megaphone, Bot, X, Calendar, FileText, BrainCircuit } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import IconografiaPescaLead from '../imports/IconografiaPescaLead';
import LogoPescaLeadBranca from '../imports/LogoPescaLeadBranca';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useAuth } from '../contexts/AuthContext';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
  { icon: Home, label: 'Dashboard', view: 'dashboard' },
  { icon: Target, label: 'Pipeline', view: 'pipeline' },
  { icon: MessageSquare, label: 'Chat', view: 'chat' },
  { icon: Download, label: 'Extração', view: 'extraction' },
  { icon: Megaphone, label: 'Campanha', view: 'campaign' },
  { icon: Bot, label: 'Atendimento de I.A', view: 'ai-service' },
  { icon: Calendar, label: 'Calendário', view: 'calendar' },
  { icon: FileText, label: 'Documentos', view: 'documents' },
  { icon: BrainCircuit, label: 'Assistente IA', view: 'ai-assistant' },
];

export function MobileSidebar({ isOpen, onClose, theme, currentView, onViewChange }: MobileSidebarProps) {
  const isDark = theme === 'dark';
  const { hasPageAccess } = useAuth();

  // Filter nav items based on page access
  const visibleNavItems = navItems.filter(item => hasPageAccess(item.view));

  const handleViewChange = (view: string) => {
    onViewChange(view);
    onClose(); // Fecha o drawer após selecionar
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className={`w-[280px] p-0 ${
          isDark 
            ? 'bg-true-black border-white/[0.08]' 
            : 'bg-light-bg border-border-light'
        }`}
      >
        {/* Hidden accessibility titles */}
        <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
        <SheetDescription className="sr-only">
          Navegue entre as diferentes seções do Pesca Lead
        </SheetDescription>

        <SheetHeader className={`h-16 flex flex-row items-center justify-start px-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          {/* Logo */}
          <div className="flex items-center justify-start pl-1">
            <div className={`h-8 w-40 relative ${!isDark ? '[&_p]:!text-[#0F172A]' : ''}`}>
              <LogoPescaLeadBranca />
            </div>
          </div>
        </SheetHeader>

        {/* Workspace Switcher */}
        <div className="px-3 pt-4 pb-2">
          <WorkspaceSwitcher theme={theme} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {visibleNavItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative ${
                currentView === item.view
                  ? isDark
                    ? 'bg-white/[0.05] text-white'
                    : 'bg-light-elevated text-text-primary-light'
                  : isDark
                  ? 'text-white/50 hover:bg-white/[0.03] hover:text-white/70'
                  : 'text-text-secondary-light hover:bg-light-elevated-hover hover:text-text-primary-light'
              }`}
              onClick={() => handleViewChange(item.view)}
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
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0169D9] rounded-r" />
              )}
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}