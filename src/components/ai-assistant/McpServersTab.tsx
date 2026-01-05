import { useState } from 'react';
import { Theme } from '../../hooks/useTheme';
import { useMcpServers } from '../../hooks/useMcpServers';
import type { McpServerConfig } from '../../types/mcp';
import {
  Plus,
  Plug,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
  Wrench,
} from 'lucide-react';
import { AddMcpServerModal } from './AddMcpServerModal';

interface McpServersTabProps {
  workspaceId: string;
  theme: Theme;
}

export function McpServersTab({ workspaceId, theme }: McpServersTabProps) {
  const isDark = theme === 'dark';

  const {
    servers,
    isLoading,
    error,
    addServer,
    deleteServer,
    syncServer,
    toggleServer,
  } = useMcpServers(workspaceId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSync = async (serverId: string) => {
    setSyncingId(serverId);
    try {
      await syncServer(serverId);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('Tem certeza que deseja remover este servidor MCP?')) return;

    setDeletingId(serverId);
    try {
      await deleteServer(serverId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (serverId: string, currentEnabled: boolean) => {
    await toggleServer(serverId, !currentEnabled);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Integrações MCP
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Conecte ferramentas externas à sua IA
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#0169D9] text-white hover:bg-[#0169D9]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {error}
        </div>
      )}

      {/* Empty State */}
      {servers.length === 0 && !error && (
        <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <Plug className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Nenhum servidor MCP configurado
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Adicione servidores para estender as capacidades da IA
          </p>
        </div>
      )}

      {/* Servers List */}
      {servers.length > 0 && (
        <div className="space-y-3">
          {servers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              theme={theme}
              isSyncing={syncingId === server.id}
              isDeleting={deletingId === server.id}
              onSync={() => handleSync(server.id)}
              onDelete={() => handleDelete(server.id)}
              onToggle={() => handleToggle(server.id, server.is_enabled)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddMcpServerModal
          workspaceId={workspaceId}
          theme={theme}
          onAdd={addServer}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Server Card Component
// ============================================================================

interface McpServerCardProps {
  server: McpServerConfig;
  theme: Theme;
  isSyncing: boolean;
  isDeleting: boolean;
  onSync: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function McpServerCard({
  server,
  theme,
  isSyncing,
  isDeleting,
  onSync,
  onDelete,
  onToggle,
}: McpServerCardProps) {
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  const toolsCount = server.tools?.filter((t) => t.is_enabled).length || 0;
  const hasError = !!server.sync_error;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isDark
          ? 'bg-[#0a0a0a] border-white/[0.08] hover:border-white/20'
          : 'bg-white border-border-light hover:border-gray-300'
      } ${!server.is_enabled ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              hasError
                ? isDark
                  ? 'bg-red-500/10'
                  : 'bg-red-50'
                : isDark
                ? 'bg-[#0169D9]/10'
                : 'bg-blue-50'
            }`}
          >
            <Plug
              className={`w-4 h-4 ${
                hasError ? 'text-red-500' : 'text-[#0169D9]'
              }`}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {server.name}
              </h4>
              {server.is_public && (
                <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} title="Público" />
              )}
              {server.auth_type !== 'none' && (
                <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} title="Autenticado" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {server.server_url}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1">
            {hasError ? (
              <AlertCircle className="w-4 h-4 text-red-500" title={server.sync_error} />
            ) : (
              <CheckCircle className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/10 text-white/50 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
              title="Sincronizar"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>

            {/* Toggle */}
            <button
              onClick={onToggle}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                server.is_enabled
                  ? 'bg-[#0169D9]'
                  : isDark
                  ? 'bg-white/20'
                  : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  server.is_enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>

            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-red-500/10 text-white/50 hover:text-red-400'
                  : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
              }`}
              title="Remover"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>

            {/* Expand */}
            <button
              onClick={() => setExpanded(!expanded)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/10 text-white/50 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tools badges */}
        {toolsCount > 0 && !expanded && (
          <div className="flex items-center gap-1.5 mt-2 ml-12">
            <Wrench className={`w-3 h-3 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              {toolsCount} ferramenta{toolsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className={`px-3 pb-3 pt-0 border-t ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
          {/* Error message */}
          {hasError && (
            <div className={`mt-3 p-2 rounded-lg text-xs ${
              isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              {server.sync_error}
            </div>
          )}

          {/* Tools list */}
          {server.tools && server.tools.length > 0 && (
            <div className="mt-3">
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Ferramentas disponíveis:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {server.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className={`px-2 py-1 rounded-md text-xs ${
                      tool.is_enabled
                        ? isDark
                          ? 'bg-[#0169D9]/10 text-[#0169D9]'
                          : 'bg-blue-50 text-blue-700'
                        : isDark
                        ? 'bg-white/5 text-white/30'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    title={tool.description}
                  >
                    {tool.tool_name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last sync */}
          {server.last_sync_at && (
            <p className={`text-xs mt-3 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              Última sincronização:{' '}
              {new Date(server.last_sync_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
