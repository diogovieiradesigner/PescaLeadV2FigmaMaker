import { useState, useEffect } from 'react';
import {
  Link2,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  MessageCircle,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface PublicChatLink {
  id: string;
  public_slug: string;
  access_code: string;
  name: string;
  is_active: boolean;
  expires_at: string | null;
  max_conversations: number | null;
  current_conversations: number;
  total_messages: number;
  welcome_message: string | null;
  chat_title: string | null;
  chat_subtitle: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface PublicChatLinksManagerProps {
  agentId: string;
  workspaceId: string;
  isDark?: boolean;
}

export function PublicChatLinksManager({ agentId, workspaceId, isDark = true }: PublicChatLinksManagerProps) {
  const [links, setLinks] = useState<PublicChatLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formWelcomeMessage, setFormWelcomeMessage] = useState('');
  const [formChatTitle, setFormChatTitle] = useState('');
  const [formChatSubtitle, setFormChatSubtitle] = useState('');

  const loadLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_public_chat_links')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (err: any) {
      console.error('Error loading links:', err);
      toast.error('Erro ao carregar links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      loadLinks();
    }
  }, [agentId]);

  const handleCreateLink = async () => {
    try {
      setCreating(true);
      const { data, error } = await supabase.rpc('create_public_chat_link', {
        p_agent_id: agentId,
        p_workspace_id: workspaceId,
        p_name: formName || null,
        p_welcome_message: formWelcomeMessage || null,
        p_chat_title: formChatTitle || null,
        p_chat_subtitle: formChatSubtitle || null
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao criar link');

      toast.success('Link criado com sucesso!');
      setShowCreateForm(false);
      setFormName('');
      setFormWelcomeMessage('');
      setFormChatTitle('');
      setFormChatSubtitle('');
      loadLinks();
    } catch (err: any) {
      console.error('Error creating link:', err);
      toast.error(err.message || 'Erro ao criar link');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (link: PublicChatLink) => {
    try {
      const { error } = await supabase
        .from('ai_public_chat_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);

      if (error) throw error;

      toast.success(link.is_active ? 'Link desativado' : 'Link ativado');
      loadLinks();
    } catch (err: any) {
      console.error('Error toggling link:', err);
      toast.error('Erro ao atualizar link');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Tem certeza que deseja excluir este link?')) return;

    try {
      const { error } = await supabase
        .from('ai_public_chat_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Link excluído');
      loadLinks();
    } catch (err: any) {
      console.error('Error deleting link:', err);
      toast.error('Erro ao excluir link');
    }
  };

  const copyToClipboard = async (link: PublicChatLink, type: 'url' | 'code' | 'full') => {
    const baseUrl = window.location.origin + '/#/chat/' + link.public_slug;
    let textToCopy = '';

    if (type === 'url') {
      textToCopy = baseUrl;
    } else if (type === 'code') {
      textToCopy = link.access_code;
    } else {
      textToCopy = `Link: ${baseUrl}\nCodigo de Acesso: ${link.access_code}`;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(`${link.id}-${type}`);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copiado!');
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const openChat = (link: PublicChatLink) => {
    window.open(`/#/chat/${link.public_slug}`, '_blank');
  };

  if (loading) {
    return (
      <div className={cn(
        "p-4 rounded-xl border flex items-center justify-center",
        isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
      )}>
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isDark ? "border-white/10" : "border-gray-200"
      )}>
        <div className="flex items-center gap-2">
          <Link2 className={cn("w-5 h-5", isDark ? "text-blue-400" : "text-blue-600")} />
          <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>
            Links Publicos de Teste
          </h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            isDark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"
          )}>
            {links.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLinks}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDark
                ? "hover:bg-white/10 text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            )}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Link
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={cn(
          "p-4 border-b",
          isDark ? "bg-blue-500/10 border-white/10" : "bg-blue-50 border-gray-200"
        )}>
          <div className="space-y-3">
            <div>
              <label className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                Nome do Link (opcional)
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Link para Cliente X"
                className={cn(
                  "mt-1 w-full px-3 py-2 rounded-lg border text-sm",
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>

            <div>
              <label className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                Titulo do Chat (opcional)
              </label>
              <input
                type="text"
                value={formChatTitle}
                onChange={(e) => setFormChatTitle(e.target.value)}
                placeholder="Ex: Assistente Virtual"
                className={cn(
                  "mt-1 w-full px-3 py-2 rounded-lg border text-sm",
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>

            <div>
              <label className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                Subtitulo (opcional)
              </label>
              <input
                type="text"
                value={formChatSubtitle}
                onChange={(e) => setFormChatSubtitle(e.target.value)}
                placeholder="Ex: Tire suas duvidas conosco"
                className={cn(
                  "mt-1 w-full px-3 py-2 rounded-lg border text-sm",
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>

            <div>
              <label className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                Mensagem de Boas-vindas (opcional)
              </label>
              <textarea
                value={formWelcomeMessage}
                onChange={(e) => setFormWelcomeMessage(e.target.value)}
                placeholder="Ex: Ola! Como posso ajudar?"
                rows={2}
                className={cn(
                  "mt-1 w-full px-3 py-2 rounded-lg border text-sm resize-none",
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCreateLink}
                disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Criar Link
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isDark
                    ? "text-gray-400 hover:text-white hover:bg-white/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="divide-y divide-white/10">
        {links.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className={cn(
              "w-12 h-12 mx-auto mb-3",
              isDark ? "text-gray-600" : "text-gray-300"
            )} />
            <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
              Nenhum link criado ainda
            </p>
            <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
              Crie um link para compartilhar o chat com seus clientes
            </p>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className={cn(
                "p-4 transition-colors",
                isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "font-medium truncate",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {link.name || link.public_slug}
                    </span>
                    <span className={cn(
                      "shrink-0 text-xs px-2 py-0.5 rounded-full",
                      link.is_active
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    )}>
                      {link.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className={cn(
                      "flex items-center gap-1",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      <span className="font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                        {link.access_code}
                      </span>
                    </span>
                    <span className={cn(
                      "flex items-center gap-1",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      <Users className="w-3 h-3" />
                      {link.current_conversations} conversas
                    </span>
                    <span className={cn(
                      "flex items-center gap-1",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      <MessageCircle className="w-3 h-3" />
                      {link.total_messages} msgs
                    </span>
                    {link.last_used_at && (
                      <span className={cn(
                        "flex items-center gap-1",
                        isDark ? "text-gray-500" : "text-gray-400"
                      )}>
                        <Clock className="w-3 h-3" />
                        {new Date(link.last_used_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(link, 'full')}
                    title="Copiar link + codigo"
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDark
                        ? "hover:bg-white/10 text-gray-400 hover:text-white"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {copiedId === `${link.id}-full` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openChat(link)}
                    title="Abrir chat"
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDark
                        ? "hover:bg-white/10 text-gray-400 hover:text-white"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(link)}
                    title={link.is_active ? 'Desativar' : 'Ativar'}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDark
                        ? "hover:bg-white/10 text-gray-400 hover:text-white"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {link.is_active ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    title="Excluir"
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDark
                        ? "hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                        : "hover:bg-red-50 text-gray-500 hover:text-red-600"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PublicChatLinksManager;
