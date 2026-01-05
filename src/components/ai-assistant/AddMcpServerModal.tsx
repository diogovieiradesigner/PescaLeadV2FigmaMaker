import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Theme } from '../../hooks/useTheme';
import type { CreateMcpServerInput, TestConnectionResult, McpServerConfig } from '../../types/mcp';
import { testMcpConnection } from '../../services/mcp-service';
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plug,
  Globe,
  Key,
  Link as LinkIcon,
  Wrench,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AddMcpServerModalProps {
  workspaceId: string;
  theme: Theme;
  onAdd: (input: CreateMcpServerInput) => Promise<McpServerConfig>;
  onClose: () => void;
}

export function AddMcpServerModal({ workspaceId, theme, onAdd, onClose }: AddMcpServerModalProps) {
  const isDark = theme === 'dark';

  const [form, setForm] = useState({
    name: '',
    description: '',
    serverUrl: '',
    authType: 'none' as 'none' | 'bearer' | 'api_key',
    authToken: '',
    authHeaderName: '',
    isPublic: false,
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleTestConnection = async () => {
    if (!form.serverUrl) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testMcpConnection(
        form.serverUrl,
        form.authType,
        form.authType !== 'none' ? form.authToken : undefined,
        form.authHeaderName || undefined
      );
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao testar conexão',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.serverUrl || !testResult?.success) return;

    setSaving(true);
    try {
      await onAdd({
        workspace_id: workspaceId,
        name: form.name,
        description: form.description || undefined,
        server_url: form.serverUrl,
        auth_type: form.authType,
        auth_token: form.authType !== 'none' ? form.authToken : undefined,
        auth_header_name: form.authHeaderName || undefined,
        is_public: form.isPublic,
      });
      onClose();
    } catch {
      // Error handled by hook
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.name && form.serverUrl && testResult?.success && !saving;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-lg shadow-xl border ${
          isDark ? 'bg-true-black border-white/[0.08]' : 'bg-white border-border-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-[#0169D9]/10' : 'bg-blue-50'
            }`}>
              <Plug className="w-5 h-5 text-[#0169D9]" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Adicionar Servidor MCP
              </h2>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Conecte uma nova integração
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05]'
                : 'hover:bg-light-elevated-hover'
            }`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className={`block mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              Nome do servidor
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Meu CRM, GitHub, Salesforce..."
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
              }`}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className={`block mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              Descrição <span className={isDark ? 'text-white/30' : 'text-gray-400'}>(opcional)</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="O que este servidor faz?"
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
              }`}
            />
          </div>

          {/* URL */}
          <div>
            <label className={`block mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              <div className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                URL do servidor MCP
              </div>
            </label>
            <input
              type="url"
              value={form.serverUrl}
              onChange={(e) => {
                const url = e.target.value;
                // Detectar FastMCP - precisa de Bearer Token além da gateway_key
                const isFastMcp = url.includes('fastmcp.me') || url.includes('fastmcp_gateway_key=');
                setForm({
                  ...form,
                  serverUrl: url,
                  // FastMCP precisa de Bearer Token
                  authType: isFastMcp ? 'bearer' : form.authType,
                });
                setTestResult(null);
              }}
              placeholder="https://mcp.example.com/mcp"
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
              }`}
            />
            {/* Dica sobre FastMCP */}
            {(form.serverUrl.includes('fastmcp.me') || form.serverUrl.includes('fastmcp_gateway_key=')) && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${
                isDark ? 'text-yellow-400/70' : 'text-yellow-600'
              }`}>
                <AlertCircle className="w-3 h-3" />
                FastMCP detectado - requer Bearer Token (obtenha em fastmcp.me)
              </p>
            )}
          </div>

          {/* Tipo de Auth */}
          <div>
            <label className={`block mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Autenticação
              </div>
            </label>
            <select
              value={form.authType}
              onChange={(e) => {
                setForm({
                  ...form,
                  authType: e.target.value as 'none' | 'bearer' | 'api_key',
                  authToken: '',
                });
                setTestResult(null);
              }}
              style={isDark ? { colorScheme: 'dark' } : undefined}
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
              }`}
            >
              <option value="none" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Sem autenticação</option>
              <option value="bearer" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Bearer Token</option>
              <option value="api_key" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>API Key</option>
            </select>
          </div>

          {/* Token de Auth */}
          {form.authType !== 'none' && (
            <div>
              <label className={`block mb-2 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                {form.authType === 'bearer' ? 'Bearer Token' : 'API Key'}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.authToken}
                  onChange={(e) => {
                    setForm({ ...form, authToken: e.target.value });
                    setTestResult(null);
                  }}
                  placeholder="Seu token de autenticação"
                  className={`w-full px-3 py-2 pr-10 rounded-lg border outline-none transition-colors ${
                    isDark
                      ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                    isDark
                      ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Compartilhar */}
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            form.isPublic
              ? isDark
                ? 'bg-[#0169D9]/10 border-[#0169D9]/50'
                : 'bg-blue-50 border-blue-200'
              : isDark
              ? 'bg-[#0a0a0a] border-white/[0.08] hover:border-white/20'
              : 'bg-white border-border-light hover:border-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
              form.isPublic
                ? 'bg-[#0169D9] border-[#0169D9]'
                : isDark
                ? 'border-white/30'
                : 'border-gray-300'
            }`}>
              {form.isPublic && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Globe className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Compartilhar com o workspace
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Todos os membros poderão usar esta integração
              </p>
            </div>
          </label>

          {/* Resultado do teste */}
          {testResult && (
            <div className={`p-3 rounded-lg ${
              testResult.success
                ? isDark
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-green-50 border border-green-200'
                : isDark
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    isDark ? 'text-green-400' : 'text-green-600'
                  }`} />
                ) : (
                  <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    isDark ? 'text-red-400' : 'text-red-600'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  {testResult.success ? (
                    <>
                      <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        Conexão bem-sucedida!
                      </p>
                      <div className={`flex items-center gap-3 mt-1 text-xs ${
                        isDark ? 'text-green-400/70' : 'text-green-600'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          {testResult.tools_count} ferramenta(s)
                        </span>
                        <span>{testResult.latency_ms}ms</span>
                      </div>
                      {/* Tools preview */}
                      {testResult.tools && testResult.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {testResult.tools.slice(0, 5).map((tool, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                isDark
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {tool.name}
                            </span>
                          ))}
                          {testResult.tools.length > 5 && (
                            <span className={`text-[10px] ${
                              isDark ? 'text-green-400/50' : 'text-green-600'
                            }`}>
                              +{testResult.tools.length - 5} mais
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                        Falha na conexão
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-red-400/70' : 'text-red-600'}`}>
                        {testResult.error}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <button
            onClick={handleTestConnection}
            disabled={!form.serverUrl || testing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !form.serverUrl || testing
                ? isDark
                  ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                  : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                : isDark
                ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                : 'bg-light-elevated text-gray-700 hover:bg-light-elevated-hover'
            }`}
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            Testar Conexão
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white/70'
                  : 'hover:bg-light-elevated text-text-secondary-light'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                canSubmit
                  ? 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                  : isDark
                  ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                  : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
              }`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
