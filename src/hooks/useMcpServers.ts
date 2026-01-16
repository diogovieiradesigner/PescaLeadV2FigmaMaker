import { useState, useEffect, useCallback } from 'react';
import {
  listMcpServers,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  syncMcpServer,
  testMcpConnection,
  toggleMcpServer,
} from '../services/mcp-service';
import type {
  McpServerConfig,
  CreateMcpServerInput,
  UpdateMcpServerInput,
  TestConnectionResult,
  McpServersState,
  McpServersActions,
} from '../types/mcp';
import { toast } from 'sonner';

export interface UseMcpServersReturn extends McpServersState, McpServersActions {}

/**
 * Hook para gerenciar servidores MCP
 */
export function useMcpServers(workspaceId: string | undefined): UseMcpServersReturn {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar servidores
  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setServers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listMcpServers(workspaceId);
      setServers(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar servidores MCP';
      setError(message);
      console.error('[useMcpServers] Error loading servers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Carregar ao montar ou quando workspaceId mudar
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Adicionar servidor
  const addServer = useCallback(
    async (input: CreateMcpServerInput): Promise<McpServerConfig> => {
      if (!workspaceId) {
        throw new Error('Workspace não selecionado');
      }

      try {
        const server = await createMcpServer({
          ...input,
          workspace_id: workspaceId,
        });

        setServers((prev) => [server, ...prev]);
        toast.success(`Servidor "${server.name}" adicionado com sucesso!`);
        return server;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao adicionar servidor';
        toast.error(message);
        throw err;
      }
    },
    [workspaceId]
  );

  // Atualizar servidor
  const updateServerFn = useCallback(
    async (serverId: string, input: UpdateMcpServerInput): Promise<McpServerConfig> => {
      try {
        const server = await updateMcpServer(serverId, input);

        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? server : s))
        );

        toast.success('Servidor atualizado!');
        return server;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar servidor';
        toast.error(message);
        throw err;
      }
    },
    []
  );

  // Deletar servidor
  const deleteServerFn = useCallback(async (serverId: string): Promise<void> => {
    try {
      await deleteMcpServer(serverId);
      setServers((prev) => prev.filter((s) => s.id !== serverId));
      toast.success('Servidor removido!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover servidor';
      toast.error(message);
      throw err;
    }
  }, []);

  // Sincronizar servidor
  const syncServerFn = useCallback(async (serverId: string): Promise<McpServerConfig> => {
    try {
      const server = await syncMcpServer(serverId);

      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? server : s))
      );

      const toolsCount = server.tools?.length || 0;
      toast.success(`Sincronizado! ${toolsCount} ferramenta(s) encontrada(s).`);
      return server;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao sincronizar';
      toast.error(message);
      throw err;
    }
  }, []);

  // Testar conexão
  const testConnectionFn = useCallback(
    async (
      serverUrl: string,
      authType?: string,
      authToken?: string
    ): Promise<TestConnectionResult> => {
      try {
        return await testMcpConnection(serverUrl, authType, authToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao testar conexão';
        return { success: false, error: message };
      }
    },
    []
  );

  // Toggle servidor
  const toggleServerFn = useCallback(
    async (serverId: string, enabled: boolean): Promise<void> => {
      try {
        const server = await toggleMcpServer(serverId, enabled);

        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? server : s))
        );

        toast.success(enabled ? 'Servidor ativado!' : 'Servidor desativado!');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao alterar status';
        toast.error(message);
        throw err;
      }
    },
    []
  );

  return {
    // State
    servers,
    isLoading,
    error,

    // Actions
    refresh,
    addServer,
    updateServer: updateServerFn,
    deleteServer: deleteServerFn,
    syncServer: syncServerFn,
    testConnection: testConnectionFn,
    toggleServer: toggleServerFn,
  };
}

/**
 * Hook para verificar se há ferramentas MCP disponíveis
 */
export function useHasMcpTools(workspaceId: string | undefined): {
  hasTools: boolean;
  toolsCount: number;
  isLoading: boolean;
} {
  const { servers, isLoading } = useMcpServers(workspaceId);

  const enabledServers = servers.filter((s) => s.is_enabled);
  const toolsCount = enabledServers.reduce(
    (acc, s) => acc + (s.tools?.filter((t) => t.is_enabled).length || 0),
    0
  );

  return {
    hasTools: toolsCount > 0,
    toolsCount,
    isLoading,
  };
}
