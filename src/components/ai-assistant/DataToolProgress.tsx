import { useState } from 'react';
import { Database, Loader2, CheckCircle2, XCircle, Table2, Code } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { DataToolName } from '../../types/ai-assistant';
import { cn } from '../ui/utils';

// Mapeamento de tool name para informações de display
// Simplificado: apenas 2 tools
const TOOL_INFO: Record<DataToolName, {
  icon: typeof Database;
  label: string;
  executingLabel: string;
  color: string;
}> = {
  get_schema: {
    icon: Table2,
    label: 'Estrutura do Banco',
    executingLabel: 'Buscando estrutura...',
    color: 'text-orange-400',
  },
  execute_query: {
    icon: Code,
    label: 'Consulta SQL',
    executingLabel: 'Executando consulta...',
    color: 'text-blue-400',
  },
};

export interface DataToolCall {
  id: string;
  tool_name: DataToolName;
  arguments: Record<string, unknown>;
  status: 'executing' | 'completed' | 'failed';
  result?: {
    data_count?: number;
    query_executed?: string;
    error?: string;
  };
  execution_time_ms?: number;
}

interface DataToolProgressProps {
  calls: DataToolCall[];
  theme: Theme;
}

function formatExecutionTime(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatQuery(query?: string): string {
  if (!query) return '';
  // Limitar a 80 caracteres
  if (query.length > 80) {
    return query.substring(0, 80) + '...';
  }
  return query;
}

export function DataToolProgress({ calls, theme }: DataToolProgressProps) {
  const isDark = theme === 'dark';

  if (calls.length === 0) return null;

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      isDark
        ? "bg-[#0a0a0a] border-white/[0.08]"
        : "bg-gray-50 border-border-light"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 border-b",
        isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-border-light bg-white"
      )}>
        <Database className={cn(
          "w-4 h-4",
          isDark ? "text-[#0169D9]" : "text-[#0169D9]"
        )} />
        <span className={cn(
          "text-xs font-medium",
          isDark ? "text-white/70" : "text-text-primary-light"
        )}>
          Data Tools
        </span>
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-full",
          isDark ? "bg-white/10 text-white/50" : "bg-gray-200 text-gray-600"
        )}>
          {calls.length}
        </span>
      </div>

      {/* Tool calls list */}
      <div className="divide-y divide-white/[0.05]">
        {calls.map((call) => {
          const toolInfo = TOOL_INFO[call.tool_name];
          const Icon = toolInfo?.icon || Database;
          const isExecuting = call.status === 'executing';
          const isCompleted = call.status === 'completed';
          const isFailed = call.status === 'failed';

          // Para execute_query, mostrar preview da query
          const queryPreview = call.arguments?.query as string | undefined;

          return (
            <div
              key={call.id}
              className={cn(
                "px-3 py-2.5 flex items-start gap-3",
                isExecuting && "animate-pulse"
              )}
            >
              {/* Status icon */}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                isExecuting && (isDark ? "bg-blue-500/20" : "bg-blue-100"),
                isCompleted && (isDark ? "bg-green-500/20" : "bg-green-100"),
                isFailed && (isDark ? "bg-red-500/20" : "bg-red-100")
              )}>
                {isExecuting ? (
                  <Loader2 className={cn(
                    "w-4 h-4 animate-spin",
                    isDark ? "text-blue-400" : "text-blue-600"
                  )} />
                ) : isCompleted ? (
                  <CheckCircle2 className={cn(
                    "w-4 h-4",
                    isDark ? "text-green-400" : "text-green-600"
                  )} />
                ) : (
                  <XCircle className={cn(
                    "w-4 h-4",
                    isDark ? "text-red-400" : "text-red-600"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5", toolInfo?.color || "text-gray-400")} />
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isDark ? "text-white" : "text-text-primary-light"
                  )}>
                    {isExecuting
                      ? toolInfo?.executingLabel || 'Executando...'
                      : toolInfo?.label || call.tool_name}
                  </span>
                  {call.execution_time_ms && (
                    <span className={cn(
                      "text-xs",
                      isDark ? "text-white/40" : "text-gray-500"
                    )}>
                      ({formatExecutionTime(call.execution_time_ms)})
                    </span>
                  )}
                </div>

                {/* Query preview (when executing execute_query) */}
                {isExecuting && call.tool_name === 'execute_query' && queryPreview && (
                  <p className={cn(
                    "text-xs mt-1 font-mono truncate",
                    isDark ? "text-white/40" : "text-gray-500"
                  )}>
                    {formatQuery(queryPreview)}
                  </p>
                )}

                {/* Result */}
                {isCompleted && call.result && (
                  <p className={cn(
                    "text-xs mt-0.5",
                    isDark ? "text-green-400/70" : "text-green-600"
                  )}>
                    {call.result.data_count !== undefined
                      ? `${call.result.data_count} resultado${call.result.data_count !== 1 ? 's' : ''}`
                      : 'Concluído'}
                  </p>
                )}

                {/* Error */}
                {isFailed && call.result?.error && (
                  <p className={cn(
                    "text-xs mt-0.5",
                    isDark ? "text-red-400/70" : "text-red-600"
                  )}>
                    {call.result.error}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar o estado das Data Tool calls durante o streaming
 */
export function useDataToolCalls() {
  const [calls, setCalls] = useState<DataToolCall[]>([]);

  const addCall = (data: {
    tool_name: DataToolName;
    arguments: Record<string, unknown>;
  }) => {
    const newCall: DataToolCall = {
      id: `${data.tool_name}-${Date.now()}`,
      tool_name: data.tool_name,
      arguments: data.arguments,
      status: 'executing',
    };
    setCalls(prev => [...prev, newCall]);
  };

  const updateCall = (data: {
    tool_name: DataToolName;
    success: boolean;
    data_count?: number;
    query_executed?: string;
    error?: string;
    execution_time_ms?: number;
  }) => {
    setCalls(prev => {
      // Encontrar o último call com este tool_name que está executando
      const index = prev.findIndex(
        c => c.tool_name === data.tool_name && c.status === 'executing'
      );

      if (index === -1) return prev;

      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status: data.success ? 'completed' : 'failed',
        result: {
          data_count: data.data_count,
          query_executed: data.query_executed,
          error: data.error,
        },
        execution_time_ms: data.execution_time_ms,
      };

      return updated;
    });
  };

  const reset = () => {
    setCalls([]);
  };

  return {
    calls,
    addCall,
    updateCall,
    reset,
  };
}
