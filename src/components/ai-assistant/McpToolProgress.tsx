import { useState, useEffect } from 'react';
import { Theme } from '../../hooks/useTheme';
import { Plug, ChevronDown, ChevronUp, Check, Loader2, AlertCircle, Wrench } from 'lucide-react';

export interface McpToolCall {
  id: string;
  server_id: string;
  server_name: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  status: 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  execution_time_ms?: number;
  timestamp: Date;
}

interface McpToolProgressProps {
  toolCalls: McpToolCall[];
  isExecuting: boolean;
  theme: Theme;
}

export function McpToolProgress({ toolCalls, isExecuting, theme }: McpToolProgressProps) {
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer para mostrar tempo decorrido
  useEffect(() => {
    if (!isExecuting) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting]);

  // Reset elapsed time when tool calls change
  useEffect(() => {
    if (toolCalls.length === 0) {
      setElapsedTime(0);
    }
  }, [toolCalls.length]);

  if (toolCalls.length === 0) return null;

  const totalDuration = toolCalls.reduce((acc, call) => acc + (call.execution_time_ms || 0), 0) / 1000 || elapsedTime;

  const getStatusIcon = (call: McpToolCall) => {
    const iconClass = "w-4 h-4";

    switch (call.status) {
      case 'completed':
        return <Check className={`${iconClass} text-green-500`} />;
      case 'failed':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      case 'executing':
      default:
        return <Loader2 className={`${iconClass} animate-spin ${isDark ? 'text-[#00CFFA]' : 'text-[#0169D9]'}`} />;
    }
  };

  const getStatusLabel = (call: McpToolCall) => {
    switch (call.status) {
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Erro';
      case 'executing':
      default:
        return 'Executando';
    }
  };

  // Agrupar tool calls por servidor
  const serverNames = [...new Set(toolCalls.map(call => call.server_name))];

  return (
    <div className={`rounded-xl border mb-4 overflow-hidden transition-all ${
      isDark
        ? 'bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-white/[0.08]'
        : 'bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20'
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
            isDark ? 'text-purple-400' : 'text-purple-600'
          }`}>
            <Plug className="w-4 h-4" />
            <span className="text-sm font-medium">
              {serverNames.length === 1 ? serverNames[0] : `${serverNames.length} servidores MCP`}
            </span>
          </div>

          {isExecuting ? (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isDark ? 'bg-purple-400' : 'bg-purple-600'
              }`} />
              <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                executando...
              </span>
            </div>
          ) : (
            <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {toolCalls.every(c => c.status === 'completed') ? 'concluído' :
               toolCalls.some(c => c.status === 'failed') ? 'erro' : 'concluído'}
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

      {/* Tool Calls */}
      {isExpanded && (
        <div className={`px-4 pb-4 space-y-3 border-t ${
          isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
        }`}>
          <div className={`text-xs font-medium pt-3 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Ferramentas Executadas
          </div>

          {toolCalls.map((call) => {
            const isActive = call.status === 'executing';
            const isCompleted = call.status === 'completed';
            const isFailed = call.status === 'failed';

            return (
              <div key={call.id} className="flex items-start gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? isDark ? 'bg-green-500/10' : 'bg-green-50'
                    : isFailed
                    ? isDark ? 'bg-red-500/10' : 'bg-red-50'
                    : isDark ? 'bg-purple-500/10' : 'bg-purple-50'
                }`}>
                  {getStatusIcon(call)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Wrench className={`w-3 h-3 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${
                      isCompleted
                        ? isDark ? 'text-white/70' : 'text-gray-700'
                        : isFailed
                        ? isDark ? 'text-red-400' : 'text-red-600'
                        : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {call.tool_name}
                    </span>
                    {call.execution_time_ms && (
                      <span className={`text-xs font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        {(call.execution_time_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>

                  <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {isActive ? 'Executando ferramenta...' :
                     isCompleted ? `${call.server_name} - ${getStatusLabel(call)}` :
                     isFailed ? call.error || 'Erro ao executar ferramenta' :
                     call.server_name}
                  </p>

                  {/* Arguments preview */}
                  {call.arguments && Object.keys(call.arguments).length > 0 && (
                    <div className={`mt-1.5 px-2 py-1 rounded text-xs font-mono truncate ${
                      isDark ? 'bg-white/[0.03] text-white/50' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {Object.entries(call.arguments).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {typeof value === 'string' ? `"${value.slice(0, 30)}${value.length > 30 ? '...' : ''}"` : String(value)}
                        </span>
                      ))}
                      {Object.keys(call.arguments).length > 2 && (
                        <span className="text-white/30">+{Object.keys(call.arguments).length - 2} mais</span>
                      )}
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
