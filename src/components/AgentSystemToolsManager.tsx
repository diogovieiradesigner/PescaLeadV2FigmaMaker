import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { cn } from './ui/utils';

interface SystemTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_active: boolean;
}

interface AgentSystemToolsManagerProps {
  isDark: boolean;
  agentId: string;
  workspaceId: string;
}

const CATEGORY_CONFIG = {
  handoff: {
    label: 'Transferência'
  },
  general: {
    label: 'Geral'
  },
  crm: {
    label: 'CRM'
  },
  scheduling: {
    label: 'Agendamento'
  },
  communication: {
    label: 'Comunicação'
  }
};

export function AgentSystemToolsManager({ isDark, agentId, workspaceId }: AgentSystemToolsManagerProps) {
  const [tools, setTools] = useState<SystemTool[]>([]);
  const [enabledToolIds, setEnabledToolIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadTools();
  }, [agentId]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const { data: allTools, error: toolsError } = await supabase
        .from('ai_system_tools')
        .select('id, name, display_name, description, category, is_active')
        .eq('is_active', true)
        .order('category, name');

      if (toolsError) throw toolsError;

      const { data: agentTools, error: agentToolsError } = await supabase
        .from('ai_agent_system_tools')
        .select('system_tool_id, is_enabled')
        .eq('agent_id', agentId);

      if (agentToolsError) throw agentToolsError;

      setTools(allTools || []);
      
      const enabledIds = new Set(
        (agentTools || [])
          .filter(at => at.is_enabled)
          .map(at => at.system_tool_id)
      );
      setEnabledToolIds(enabledIds);
    } catch (error) {
      console.error('[AgentSystemToolsManager] Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = async (toolId: string, currentlyEnabled: boolean) => {
    setSaving(toolId);
    try {
      const { error } = await supabase.rpc('toggle_agent_system_tool', {
        p_agent_id: agentId,
        p_tool_id: toolId,
        p_enabled: !currentlyEnabled
      });

      if (error) throw error;

      setEnabledToolIds(prev => {
        const next = new Set(prev);
        if (currentlyEnabled) {
          next.delete(toolId);
        } else {
          next.add(toolId);
        }
        return next;
      });
    } catch (error) {
      console.error('[AgentSystemToolsManager] Error toggling tool:', error);
    } finally {
      setSaving(null);
    }
  };

  const enableAll = async () => {
    setSaving('all');
    try {
      const { error } = await supabase.rpc('enable_all_system_tools_for_agent', { 
        p_agent_id: agentId 
      });

      if (error) throw error;

      setEnabledToolIds(new Set(tools.map(t => t.id)));
    } catch (error) {
      console.error('[AgentSystemToolsManager] Error enabling all tools:', error);
    } finally {
      setSaving(null);
    }
  };

  const disableAll = async () => {
    setSaving('none');
    try {
      const { error } = await supabase.rpc('disable_all_system_tools_for_agent', { 
        p_agent_id: agentId 
      });

      if (error) throw error;

      setEnabledToolIds(new Set());
    } catch (error) {
      console.error('[AgentSystemToolsManager] Error disabling all tools:', error);
    } finally {
      setSaving(null);
    }
  };

  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, SystemTool[]>);

  if (loading) {
    return (
      <div className={cn(
        "rounded-2xl p-8",
        isDark ? "bg-[#1a1a1a]" : "bg-white"
      )}>
        <h3 className="text-xl text-white">Ferramentas do Agente</h3>
        <p className="text-sm text-white mt-2">
          Carregando ferramentas...
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl p-8",
      isDark ? "bg-[#1a1a1a]" : "bg-white"
    )}>
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-xl text-white">
          Ferramentas do Agente
        </h3>
        <p className="text-sm text-white mt-1">
          Selecione quais ferramentas a IA pode usar durante as conversas
        </p>

        {/* Botões de ação em massa */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={enableAll}
            disabled={saving !== null}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-zinc-800/80 hover:bg-zinc-700/80 text-white",
              saving === 'all' && "opacity-50 cursor-not-allowed"
            )}
          >
            Habilitar Todas
          </button>
          <button
            onClick={disableAll}
            disabled={saving !== null}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-zinc-800/80 hover:bg-zinc-700/80 text-white",
              saving === 'none' && "opacity-50 cursor-not-allowed"
            )}
          >
            Desabilitar Todas
          </button>
        </div>
      </div>

      {/* Lista de categorias */}
      <div className="space-y-8">
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          const label = config?.label || category;

          return (
            <div key={category}>
              {/* Header da categoria */}
              <div className="flex items-center gap-2 mb-5">
                <h4 className="text-base font-medium text-white">
                  {label}
                </h4>
              </div>

              {/* Ferramentas */}
              <div className="space-y-4 pl-6">
                {categoryTools.map(tool => {
                  const isEnabled = enabledToolIds.has(tool.id);
                  const isSaving = saving === tool.id;

                  return (
                    <div
                      key={tool.id}
                      className="flex items-start gap-4"
                    >
                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleTool(tool.id, isEnabled)}
                        disabled={isSaving}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out shrink-0 mt-1",
                          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]",
                          isEnabled 
                            ? "bg-blue-600" 
                            : "bg-zinc-700",
                          isSaving && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out",
                            isEnabled ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-white leading-tight">
                          {tool.display_name}
                        </div>
                        <div className="text-sm text-white mt-1.5 leading-relaxed opacity-70">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado vazio */}
      {tools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">
            Nenhuma ferramenta disponível no momento
          </p>
        </div>
      )}
    </div>
  );
}