import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Brain,
  Sparkles,
  Zap,
  Rocket,
  Lightbulb,
  Code,
  Pencil,
  BookOpen,
  GraduationCap,
  Briefcase,
  Calculator,
  BarChart3,
  Globe2,
  Heart,
  MessageCircle,
  Search,
  Shield,
  Star,
  Target,
  Terminal,
  User,
  Users,
  Wand2,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { AICustomAgent } from '../../types/ai-assistant';
import { getAgents } from '../../services/ai-agents-service';

interface AgentSelectorProps {
  workspaceId: string;
  selectedAgent: AICustomAgent | null;
  onSelectAgent: (agent: AICustomAgent | null) => void;
  theme: Theme;
  compact?: boolean; // Versão compacta para header
}

// Mapeamento de nome do ícone para componente
const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  'bot': Bot,
  'brain': Brain,
  'sparkles': Sparkles,
  'zap': Zap,
  'rocket': Rocket,
  'lightbulb': Lightbulb,
  'code': Code,
  'pencil': Pencil,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'calculator': Calculator,
  'chart-bar': BarChart3,
  'globe': Globe2,
  'heart': Heart,
  'message-circle': MessageCircle,
  'search': Search,
  'shield': Shield,
  'star': Star,
  'target': Target,
  'terminal': Terminal,
  'user': User,
  'users': Users,
  'wand-2': Wand2,
};

export function AgentSelector({
  workspaceId,
  selectedAgent,
  onSelectAgent,
  theme,
  compact = false,
}: AgentSelectorProps) {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<AICustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load agents
  useEffect(() => {
    loadAgents();
  }, [workspaceId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAgents = async () => {
    setIsLoading(false);
    try {
      const data = await getAgents(workspaceId);
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAgentIcon = (iconName: string, color: string, size: 'sm' | 'md' = 'sm') => {
    const IconComponent = iconComponents[iconName] || Bot;
    const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${color}20`,
          width: size === 'sm' ? 24 : 32,
          height: size === 'sm' ? 24 : 32,
        }}
      >
        <IconComponent className={sizeClasses} style={{ color }} />
      </div>
    );
  };

  // Se não há agentes, não mostrar o seletor
  if (!isLoading && agents.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          compact ? 'h-9' : ''
        } ${
          isDark
            ? 'hover:bg-white/[0.08] border border-white/[0.08]'
            : 'hover:bg-gray-100 border border-gray-200'
        }`}
      >
        {selectedAgent ? (
          <>
            {renderAgentIcon(selectedAgent.icon, selectedAgent.color, 'sm')}
            {!compact && (
              <span className={`text-sm truncate max-w-[120px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedAgent.name}
              </span>
            )}
          </>
        ) : (
          <>
            <Bot className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
            {!compact && (
              <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Assistente Padrão
              </span>
            )}
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${
          isDark ? 'text-white/40' : 'text-gray-400'
        }`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg shadow-xl border overflow-hidden z-50 ${
          isDark
            ? 'bg-true-black border-white/[0.08]'
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-3 py-2 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-100'}`}>
            <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Selecione um agente
            </p>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto p-1">
            {/* Default Assistant Option */}
            <button
              onClick={() => {
                onSelectAgent(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                !selectedAgent
                  ? isDark
                    ? 'bg-[#0169D9]/10 text-[#0169D9]'
                    : 'bg-[#0169D9]/5 text-[#0169D9]'
                  : isDark
                    ? 'hover:bg-white/[0.05] text-white'
                    : 'hover:bg-gray-50 text-gray-900'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-white/10' : 'bg-gray-100'
              }`}>
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Assistente Padrão</p>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Sem prompt personalizado
                </p>
              </div>
              {!selectedAgent && (
                <Check className="w-4 h-4 text-[#0169D9]" />
              )}
            </button>

            {/* Separator */}
            {agents.length > 0 && (
              <div className={`my-1 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`} />
            )}

            {/* Agent Options */}
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  onSelectAgent(agent);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedAgent?.id === agent.id
                    ? isDark
                      ? 'bg-[#0169D9]/10 text-[#0169D9]'
                      : 'bg-[#0169D9]/5 text-[#0169D9]'
                    : isDark
                      ? 'hover:bg-white/[0.05] text-white'
                      : 'hover:bg-gray-50 text-gray-900'
                }`}
              >
                {renderAgentIcon(agent.icon, agent.color, 'sm')}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  {agent.description && (
                    <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {agent.description}
                    </p>
                  )}
                </div>
                {selectedAgent?.id === agent.id && (
                  <Check className="w-4 h-4 text-[#0169D9] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Versão em cards para a tela inicial
interface AgentCardsProps {
  workspaceId: string;
  onSelectAgent: (agent: AICustomAgent | null) => void;
  theme: Theme;
}

export function AgentCards({ workspaceId, onSelectAgent, theme }: AgentCardsProps) {
  const isDark = theme === 'dark';
  const [agents, setAgents] = useState<AICustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [workspaceId]);

  const loadAgents = async () => {
    try {
      const data = await getAgents(workspaceId);
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAgentIcon = (iconName: string, color: string) => {
    const IconComponent = iconComponents[iconName] || Bot;
    return (
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <IconComponent className="w-6 h-6" style={{ color }} />
      </div>
    );
  };

  if (isLoading || agents.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mt-8">
      <p className={`text-sm mb-3 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
        Ou comece com um agente especializado:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {agents.slice(0, 6).map(agent => (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`group p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
              isDark
                ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04]'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            {renderAgentIcon(agent.icon, agent.color)}
            <h4 className={`font-medium mt-3 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {agent.name}
            </h4>
            {agent.description && (
              <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {agent.description}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
