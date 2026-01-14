/**
 * Modal de Compartilhamento de Documento
 *
 * Permite configurar o compartilhamento público de um documento:
 * - Link público para visualização
 * - Opção de permitir edição com senha de 4 dígitos
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  Edit3,
  Lock,
  Unlock,
  Globe,
  Trash2,
  Loader2,
  ExternalLink,
  BarChart2,
  AlertCircle,
} from 'lucide-react';
import {
  getShareByDocument,
  createOrUpdateShare,
  updateShare,
  disableShare,
  deleteShare,
} from '../../services/documents-service';
import type { LeadDocumentShare } from '../../types/documents';

interface ShareModalProps {
  documentId: string;
  documentTitle: string;
  workspaceId: string;
  userId?: string;
  onClose: () => void;
}

export function ShareModal({
  documentId,
  documentTitle,
  workspaceId,
  userId,
  onClose,
}: ShareModalProps) {
  const [share, setShare] = useState<LeadDocumentShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Config state
  const [allowEdit, setAllowEdit] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load existing share
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { share: existingShare } = await getShareByDocument(documentId);

      if (existingShare) {
        setShare(existingShare);
        setAllowEdit(existingShare.allow_edit);
        if (existingShare.edit_password_hash) {
          setPassword(existingShare.edit_password_hash);
        }
      }

      setLoading(false);
    }

    load();
  }, [documentId]);

  const getShareUrl = useCallback(() => {
    if (!share) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/doc/${share.share_slug}`;
  }, [share]);

  const handleCopyLink = useCallback(async () => {
    const url = getShareUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getShareUrl]);

  const handleCreateShare = useCallback(async () => {
    setSaving(true);

    const { share: newShare, error } = await createOrUpdateShare({
      document_id: documentId,
      workspace_id: workspaceId,
      allow_edit: allowEdit,
      edit_password: allowEdit && password ? password : undefined,
      created_by: userId,
    });

    if (!error && newShare) {
      setShare(newShare);
    }

    setSaving(false);
  }, [documentId, workspaceId, allowEdit, password, userId]);

  const handleUpdateShare = useCallback(async () => {
    if (!share) return;

    setSaving(true);

    const { share: updatedShare, error } = await updateShare(share.id, {
      allow_edit: allowEdit,
      edit_password: allowEdit ? (password || null) : null,
    });

    if (!error && updatedShare) {
      setShare(updatedShare);
    }

    setSaving(false);
  }, [share, allowEdit, password]);

  const handleToggleActive = useCallback(async () => {
    if (!share) return;

    setSaving(true);

    if (share.is_active) {
      await disableShare(share.id);
      setShare({ ...share, is_active: false });
    } else {
      const { share: updatedShare } = await updateShare(share.id, {
        is_active: true,
      });
      if (updatedShare) {
        setShare(updatedShare);
      }
    }

    setSaving(false);
  }, [share]);

  const handleDeleteShare = useCallback(async () => {
    if (!share) return;

    if (!window.confirm('Tem certeza que deseja remover o compartilhamento? O link deixará de funcionar.')) {
      return;
    }

    setSaving(true);
    await deleteShare(share.id);
    setShare(null);
    setSaving(false);
  }, [share]);

  const handlePasswordChange = (value: string) => {
    // Apenas dígitos, máximo 4
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setPassword(cleaned);
  };

  const isValidPassword = password.length === 4 || password.length === 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
        <div className="bg-[#1e1e1e] rounded-xl shadow-2xl p-8 border border-white/10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10010 }}>
      <div className="bg-[#1e1e1e] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Compartilhar Documento</h2>
              <p className="text-sm text-white/50 truncate max-w-xs">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Link Section */}
          {share ? (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {share.is_active ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium text-green-400">Link ativo</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-white/30 rounded-full" />
                      <span className="text-sm font-medium text-white/50">Link desativado</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-white/50">
                  <BarChart2 className="w-3 h-3" />
                  <span>{share.view_count} visualizações</span>
                </div>
              </div>

              {/* Link input */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <LinkIcon className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <input
                    type="text"
                    value={getShareUrl()}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-white/80 outline-none"
                  />
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 text-white/60 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-white/5 rounded-lg border border-white/10">
              <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/80 mb-1">Este documento não está compartilhado</p>
              <p className="text-sm text-white/50">
                Crie um link público para compartilhar com qualquer pessoa
              </p>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-4">
            <h3 className="font-medium text-white">Permissões</h3>

            {/* View mode - always on */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-white/60" />
                <div>
                  <p className="font-medium text-white">Visualização</p>
                  <p className="text-sm text-white/50">Qualquer pessoa com o link pode visualizar</p>
                </div>
              </div>
              <div className="text-sm text-green-400 font-medium">Sempre ativo</div>
            </div>

            {/* Edit mode */}
            <div className={`p-3 rounded-lg border-2 transition-colors ${
              allowEdit ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-white/5'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Edit3 className={`w-5 h-5 ${allowEdit ? 'text-blue-500' : 'text-white/40'}`} />
                  <div>
                    <p className="font-medium text-white">Permitir edição</p>
                    <p className="text-sm text-white/50">Visitantes podem editar o documento</p>
                  </div>
                </div>
                <button
                  onClick={() => setAllowEdit(!allowEdit)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    allowEdit ? 'bg-blue-600' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    allowEdit ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Password field */}
              {allowEdit && (
                <div className="mt-4 pt-4 border-t border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-blue-500" />
                    <label className="text-sm font-medium text-white/80">
                      Senha de edição (4 dígitos)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="0000"
                        maxLength={4}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-center tracking-[0.5em] font-mono text-lg text-white placeholder-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                      >
                        {showPassword ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {password && !isValidPassword && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      A senha deve ter exatamente 4 dígitos
                    </p>
                  )}
                  {!password && (
                    <p className="text-xs text-white/50 mt-1">
                      Deixe em branco para edição sem senha
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5">
          {share ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleActive}
                  disabled={saving}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    share.is_active
                      ? 'text-white/60 hover:bg-white/10'
                      : 'text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  {share.is_active ? 'Desativar link' : 'Reativar link'}
                </button>
                <button
                  onClick={handleDeleteShare}
                  disabled={saving}
                  className="text-sm px-3 py-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleUpdateShare}
                disabled={saving || !isValidPassword}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Salvar alterações
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="text-sm px-4 py-2 text-white/60 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateShare}
                disabled={saving || (allowEdit && !isValidPassword)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                Criar link público
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
