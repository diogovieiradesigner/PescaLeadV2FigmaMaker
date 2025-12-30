import { useState, useEffect } from 'react';
import { Theme } from '../../hooks/useTheme';
import { SearchStep, SearchSource } from '../../types/ai-assistant';
import { Search, ChevronDown, ChevronUp, Check, Loader2, Brain, Globe, Sparkles } from 'lucide-react';

interface SearchProgressProps {
  steps: SearchStep[];
  isSearching: boolean;
  theme: Theme;
}

export function SearchProgress({ steps, isSearching, theme }: SearchProgressProps) {
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer para mostrar tempo decorrido
  useEffect(() => {
    if (!isSearching) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [isSearching]);

  // Reset elapsed time when steps change
  useEffect(() => {
    if (steps.length === 0) {
      setElapsedTime(0);
    }
  }, [steps.length]);

  if (steps.length === 0) return null;

  const totalDuration = steps.reduce((acc, step) => acc + (step.duration || 0), 0) || elapsedTime;

  const getStepIcon = (step: SearchStep, isActive: boolean) => {
    const iconClass = "w-4 h-4";

    if (step.type === 'complete' || (!isSearching && steps.indexOf(step) < steps.length - 1)) {
      return <Check className={`${iconClass} text-green-500`} />;
    }

    if (isActive && isSearching) {
      return <Loader2 className={`${iconClass} animate-spin ${isDark ? 'text-[#00CFFA]' : 'text-[#0169D9]'}`} />;
    }

    switch (step.type) {
      case 'thinking':
        return <Brain className={iconClass} />;
      case 'searching':
      case 'tool_call':
        return <Globe className={iconClass} />;
      case 'tool_response':
      case 'analyzing':
        return <Sparkles className={iconClass} />;
      default:
        return <Search className={iconClass} />;
    }
  };

  const getStepLabel = (step: SearchStep) => {
    switch (step.type) {
      case 'thinking':
        return 'Analisando';
      case 'searching':
      case 'tool_call':
        return 'Pesquisando';
      case 'tool_response':
        return 'Processando';
      case 'analyzing':
        return 'Analisando';
      case 'complete':
        return 'Concluído';
      default:
        return step.type;
    }
  };

  return (
    <div className={`rounded-xl border mb-4 overflow-hidden transition-all ${
      isDark
        ? 'bg-gradient-to-br from-[#0169D9]/5 to-[#00CFFA]/5 border-white/[0.08]'
        : 'bg-gradient-to-br from-[#0169D9]/5 to-[#00CFFA]/5 border-[#0169D9]/20'
    }`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${
            isDark ? 'text-[#00CFFA]' : 'text-[#0169D9]'
          }`}>
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">tavily</span>
          </div>

          {isSearching ? (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isDark ? 'bg-[#00CFFA]' : 'bg-[#0169D9]'
              }`} />
              <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                pesquisando...
              </span>
            </div>
          ) : (
            <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              concluído
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            {totalDuration.toFixed(1)}s
          </span>
          {isExpanded ? (
            <ChevronUp className={`w-4 h-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
          )}
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className={`px-4 pb-4 space-y-3 border-t ${
          isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
        }`}>
          <div className={`text-xs font-medium pt-3 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Reasoning Trace
          </div>

          {steps.map((step, index) => {
            const isActive = index === steps.length - 1;
            const isCompleted = !isSearching || index < steps.length - 1;

            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? isDark ? 'bg-green-500/10' : 'bg-green-50'
                    : isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
                }`}>
                  {getStepIcon(step, isActive)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      isCompleted
                        ? isDark ? 'text-white/70' : 'text-gray-700'
                        : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {getStepLabel(step)}
                    </span>
                    {step.duration && (
                      <span className={`text-xs font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        {step.duration.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {step.message}
                  </p>

                  {/* Query detail */}
                  {step.details?.query && (
                    <div className={`mt-1.5 px-2 py-1 rounded text-xs font-mono truncate ${
                      isDark ? 'bg-white/[0.03] text-white/50' : 'bg-gray-50 text-gray-600'
                    }`}>
                      "{step.details.query}"
                    </div>
                  )}

                  {/* Results count */}
                  {step.details?.resultsCount !== undefined && (
                    <div className={`mt-1 text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                      {step.details.resultsCount} resultados encontrados
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
