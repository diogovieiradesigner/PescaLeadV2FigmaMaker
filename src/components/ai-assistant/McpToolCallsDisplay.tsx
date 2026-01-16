import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { McpToolCallRecord } from '../../types/ai-assistant';
import { Plug, ChevronDown, ChevronUp, Check, AlertCircle, Wrench } from 'lucide-react';

interface McpToolCallsDisplayProps {
  toolCalls: McpToolCallRecord[];
  theme: Theme;
}

export function McpToolCallsDisplay({ toolCalls, theme }: McpToolCallsDisplayProps) {
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  const totalDuration = toolCalls.reduce((acc, call) => acc + (call.execution_time_ms || 0), 0) / 1000;
  const allCompleted = toolCalls.every(c => c.status === 'completed');
  const hasErrors = toolCalls.some(c => c.status === 'failed');

  // Agrupar por servidor
  const serverNames = [...new Set(toolCalls.map(call => call.server_name))];

  return (
    <div className={`rounded-xl border mt-3 overflow-hidden transition-all ${
      isDark
        ? 'bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-white/[0.08]'
        : 'bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20'
    }`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 ${
            isDark ? 'text-purple-400' : 'text-purple-600'
          }`}>
            <Plug className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {serverNames.length === 1 ? serverNames[0] : `${serverNames.length} servidores MCP`}
            </span>
          </div>

          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            hasErrors
              ? isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
              : isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
          }`}>
            {hasErrors ? 'erro' : 'concluído'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            {toolCalls.length} ferramenta{toolCalls.length !== 1 ? 's' : ''} • {totalDuration.toFixed(1)}s
          </span>
          {isExpanded ? (
            <ChevronUp className={`w-3.5 h-3.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
          )}
        </div>
      </div>

      {/* Tool Calls List */}
      {isExpanded && (
        <div className={`px-3 pb-3 space-y-2 border-t ${
          isDark ? 'border-white/[0.05]' : 'border-black/[0.05]'
        }`}>
          {toolCalls.map((call) => {
            const isCompleted = call.status === 'completed';
            const isFailed = call.status === 'failed';

            return (
              <div key={call.id} className="flex items-start gap-2 pt-2">
                {/* Icon */}
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? isDark ? 'bg-green-500/10' : 'bg-green-50'
                    : isDark ? 'bg-red-500/10' : 'bg-red-50'
                }`}>
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Wrench className={`w-2.5 h-2.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${
                      isCompleted
                        ? isDark ? 'text-white/70' : 'text-gray-700'
                        : isDark ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {call.tool_name}
                    </span>
                    {call.execution_time_ms && (
                      <span className={`text-[10px] font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        {(call.execution_time_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>

                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {isFailed ? call.error || 'Erro ao executar ferramenta' : call.server_name}
                  </p>

                  {/* Arguments preview */}
                  {call.arguments && Object.keys(call.arguments).length > 0 && (
                    <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono truncate ${
                      isDark ? 'bg-white/[0.03] text-white/50' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {Object.entries(call.arguments).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {typeof value === 'string' ? `"${value.slice(0, 20)}${value.length > 20 ? '...' : ''}"` : String(value)}
                        </span>
                      ))}
                      {Object.keys(call.arguments).length > 2 && (
                        <span className={isDark ? 'text-white/30' : 'text-gray-400'}>+{Object.keys(call.arguments).length - 2}</span>
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
