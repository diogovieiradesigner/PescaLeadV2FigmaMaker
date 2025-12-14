/**
 * VersionHistory Component
 * Exibe o histórico de versões de um documento e permite restaurar versões anteriores
 */

import { useState, useEffect } from 'react';
import { X, History, RotateCcw, Clock, User } from 'lucide-react';
import { getVersionsByDocument } from '../../services/documents-service';
import type { LeadDocumentVersion } from '../../types/documents';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onRestore: (version: LeadDocumentVersion) => void;
  theme?: 'dark' | 'light';
}

export function VersionHistory({
  isOpen,
  onClose,
  documentId,
  onRestore,
  theme = 'dark',
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<LeadDocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<LeadDocumentVersion | null>(null);

  const isDark = theme === 'dark';

  // Carregar versões
  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions();
    }
  }, [isOpen, documentId]);

  const loadVersions = async () => {
    setLoading(true);
    const { versions: data, error } = await getVersionsByDocument(documentId);
    if (!error) {
      setVersions(data);
    }
    setLoading(false);
  };

  const handleRestore = async (version: LeadDocumentVersion) => {
    setRestoring(version.id);
    try {
      await onRestore(version);
      onClose();
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `Há ${diffMinutes} minutos`;
    }
    if (diffHours < 24) {
      return `Há ${diffHours} horas`;
    }
    if (diffDays < 7) {
      return `Há ${diffDays} dias`;
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pré-visualização do conteúdo
  const getContentPreview = (version: LeadDocumentVersion) => {
    const text = version.content_text || '';
    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10003 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-xl shadow-2xl flex flex-col ${
          isDark ? 'bg-[#1a1a1a] border border-white/[0.1]' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <History className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Histórico de Versões
              </h3>
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {versions.length} {versions.length === 1 ? 'versão salva' : 'versões salvas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
              <p className={`text-lg font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Nenhuma versão salva
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                Versões são salvas automaticamente ao editar o documento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedVersion?.id === version.id
                      ? isDark
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Versão {version.version_number}
                        </span>
                        {index === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">
                            Mais recente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(version.created_at)}
                        </span>
                        {version.created_by && (
                          <span className={`flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            <User className="w-3 h-3" />
                            Usuário
                          </span>
                        )}
                      </div>
                      {/* Preview do conteúdo */}
                      <p className={`text-xs mt-2 line-clamp-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        {getContentPreview(version) || 'Documento vazio'}
                      </p>
                    </div>

                    {/* Botão Restaurar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version);
                      }}
                      disabled={restoring === version.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        restoring === version.id
                          ? 'opacity-50 cursor-not-allowed'
                          : isDark
                            ? 'bg-white/10 hover:bg-white/20 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {restoring === version.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      {restoring === version.id ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com info */}
        <div className={`p-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
          <p className={`text-xs text-center ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Restaurar uma versão substitui o conteúdo atual do documento
          </p>
        </div>
      </div>
    </div>
  );
}
