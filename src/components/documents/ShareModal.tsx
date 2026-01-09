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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Compartilhar Documento</h2>
              <p className="text-sm text-gray-500 truncate max-w-xs">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
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
                      <span className="text-sm font-medium text-green-700">Link ativo</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="text-sm font-medium text-gray-500">Link desativado</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <BarChart2 className="w-3 h-3" />
                  <span>{share.view_count} visualizações</span>
                </div>
              </div>

              {/* Link input */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border rounded-lg">
                  <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={getShareUrl()}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                  />
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
                  className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">Este documento não está compartilhado</p>
              <p className="text-sm text-gray-500">
                Crie um link público para compartilhar com qualquer pessoa
              </p>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Permissões</h3>

            {/* View mode - always on */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Visualização</p>
                  <p className="text-sm text-gray-500">Qualquer pessoa com o link pode visualizar</p>
                </div>
              </div>
              <div className="text-sm text-green-600 font-medium">Sempre ativo</div>
            </div>

            {/* Edit mode */}
            <div className={`p-3 rounded-lg border-2 transition-colors ${
              allowEdit ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Edit3 className={`w-5 h-5 ${allowEdit ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium text-gray-900">Permitir edição</p>
                    <p className="text-sm text-gray-500">Visitantes podem editar o documento</p>
                  </div>
                </div>
                <button
                  onClick={() => setAllowEdit(!allowEdit)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    allowEdit ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    allowEdit ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Password field */}
              {allowEdit && (
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <label className="text-sm font-medium text-gray-700">
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
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none text-center tracking-[0.5em] font-mono text-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      A senha deve ter exatamente 4 dígitos
                    </p>
                  )}
                  {!password && (
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe em branco para edição sem senha
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          {share ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleActive}
                  disabled={saving}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    share.is_active
                      ? 'text-gray-600 hover:bg-gray-200'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {share.is_active ? 'Desativar link' : 'Reativar link'}
                </button>
                <button
                  onClick={handleDeleteShare}
                  disabled={saving}
                  className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleUpdateShare}
                disabled={saving || !isValidPassword}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
                className="text-sm px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateShare}
                disabled={saving || (allowEdit && !isValidPassword)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
