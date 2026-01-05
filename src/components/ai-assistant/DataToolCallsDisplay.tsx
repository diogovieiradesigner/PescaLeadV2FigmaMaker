import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { DataToolCallRecord, DataToolName } from '../../types/ai-assistant';
import { Database, ChevronDown, ChevronUp, Check, AlertCircle, Table2, Code } from 'lucide-react';

// Mapeamento de tool name para informações de display
// Simplificado: apenas 2 tools
const TOOL_INFO: Record<DataToolName, {
  icon: typeof Database;
  label: string;
  color: string;
}> = {
  get_schema: {
    icon: Table2,
    label: 'Estrutura do Banco',
    color: 'text-orange-400',
  },
  execute_query: {
    icon: Code,
    label: 'Consulta SQL',
    color: 'text-blue-400',
  },
};

interface DataToolCallsDisplayProps {
  toolCalls: DataToolCallRecord[];
  theme: Theme;
}

export function DataToolCallsDisplay({ toolCalls, theme }: DataToolCallsDisplayProps) {
  const isDark = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  const totalDuration = toolCalls.reduce((acc, call) => acc + (call.execution_time_ms || 0), 0) / 1000;
  const hasErrors = toolCalls.some(c => c.status === 'failed');
  const totalResults = toolCalls.reduce((acc, call) => acc + (call.result?.data_count || 0), 0);

  return (
    <div className={`rounded-xl border mt-3 overflow-hidden transition-all ${
      isDark
        ? 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-white/[0.08]'
        : 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20'
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
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            <Database className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              Data Tools
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
            {toolCalls.length} consulta{toolCalls.length !== 1 ? 's' : ''} • {totalDuration.toFixed(2)}s
            {totalResults > 0 && ` • ${totalResults} resultado${totalResults !== 1 ? 's' : ''}`}
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
            const toolInfo = TOOL_INFO[call.tool_name];
            const Icon = toolInfo?.icon || Database;

            // Para execute_query, mostrar a query executada se disponível
            const queryExecuted = call.result?.query_executed;
            const queryPreview = call.arguments?.query as string | undefined;

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
                    <Icon className={`w-2.5 h-2.5 ${toolInfo?.color || 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${
                      isCompleted
                        ? isDark ? 'text-white/70' : 'text-gray-700'
                        : isDark ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {toolInfo?.label || call.tool_name}
                    </span>
                    {call.execution_time_ms && (
                      <span className={`text-[10px] font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        {call.execution_time_ms}ms
                      </span>
                    )}
                  </div>

                  {/* Result or Error */}
                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {isFailed
                      ? call.result?.error || 'Erro ao executar consulta'
                      : call.result?.data_count !== undefined
                        ? `${call.result.data_count} resultado${call.result.data_count !== 1 ? 's' : ''}`
                        : 'Concluído'
                    }
                  </p>

                  {/* SQL Query preview for execute_query */}
                  {call.tool_name === 'execute_query' && (queryPreview || queryExecuted) && (
                    <div className={`mt-1 px-1.5 py-1 rounded text-[10px] font-mono overflow-x-auto ${
                      isDark ? 'bg-white/[0.03] text-white/50' : 'bg-gray-50 text-gray-600'
                    }`}>
                      <code className="whitespace-pre-wrap break-all">
                        {(queryExecuted || queryPreview || '').slice(0, 150)}
                        {(queryExecuted || queryPreview || '').length > 150 && '...'}
                      </code>
                    </div>
                  )}

                  {/* Arguments preview for other tools */}
                  {call.tool_name !== 'execute_query' && call.arguments && Object.keys(call.arguments).length > 0 && (
                    <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono truncate ${
                      isDark ? 'bg-white/[0.03] text-white/50' : 'bg-gray-50 text-gray-600'
                    }`}>
                      {Object.entries(call.arguments).slice(0, 2).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          {key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) : typeof value === 'string' ? `"${value.slice(0, 20)}${value.length > 20 ? '...' : ''}"` : String(value)}
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
