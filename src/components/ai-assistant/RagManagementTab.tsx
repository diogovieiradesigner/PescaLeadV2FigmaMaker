import { useState } from 'react';
import { Trash2, FileText, Calendar, MessageSquare, Loader2, Database, AlertCircle } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { useRagDocuments } from '../../hooks/useAssistantRag';
import type { AssistantRagDocument } from '../../types/ai-assistant';

interface RagManagementTabProps {
  workspaceId: string;
  theme: Theme;
}

interface ConfirmModalState {
  show: boolean;
  id: string;
  title: string;
}

export function RagManagementTab({ workspaceId, theme }: RagManagementTabProps) {
  const isDark = theme === 'dark';
  const { documents, totalDocuments, isLoading, error, refresh, deleteDocument } = useRagDocuments(workspaceId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ show: false, id: '', title: '' });

  const handleDelete = (doc: AssistantRagDocument) => {
    setConfirmModal({
      show: true,
      id: doc.id,
      title: doc.title,
    });
  };

  const confirmDelete = async () => {
    const docId = confirmModal.id;
    setConfirmModal({ show: false, id: '', title: '' });
    setDeletingId(docId);
    try {
      await deleteDocument(docId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
        <p className={`mt-3 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Carregando conversas...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 px-4 text-center`}>
        <AlertCircle className={`w-10 h-10 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`mt-3 text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
          Erro ao carregar conversas
        </p>
        <p className={`mt-1 text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          {error}
        </p>
        <button
          onClick={refresh}
          className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 px-4 text-center`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
          isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
        }`}>
          <Database className={`w-8 h-8 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
        </div>
        <h3 className={`mt-4 text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Nenhuma conversa salva
        </h3>
        <p className={`mt-2 text-sm max-w-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Clique no ícone de banco de dados no header de uma conversa para salvá-la na base de conhecimento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between mb-4 pb-4 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-gray-200'
      }`}>
        <div>
          <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Conversas Salvas
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            {totalDocuments} {totalDocuments === 1 ? 'conversa' : 'conversas'} na base de conhecimento
          </p>
        </div>
        <button
          onClick={refresh}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-white/10 text-white/50 hover:text-white'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
          title="Atualizar lista"
        >
          <Loader2 className="w-4 h-4" />
        </button>
      </div>

      {/* Documents List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={`group flex items-start gap-3 p-3 rounded-xl transition-colors ${
              isDark
                ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-[#0169D9]/20' : 'bg-[#0169D9]/10'
            }`}>
              <FileText className="w-5 h-5 text-[#0169D9]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium truncate ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {doc.title}
              </h4>
              <div className={`flex items-center gap-3 mt-1 text-xs ${
                isDark ? 'text-white/40' : 'text-gray-500'
              }`}>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {doc.message_count} msgs
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(doc.imported_at)}
                </span>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => handleDelete(doc)}
              disabled={deletingId === doc.id}
              className={`flex-shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                deletingId === doc.id
                  ? isDark
                    ? 'text-white/30'
                    : 'text-gray-300'
                  : isDark
                    ? 'text-red-400 hover:bg-red-500/20'
                    : 'text-red-500 hover:bg-red-50'
              }`}
              title="Remover da base de conhecimento"
            >
              {deletingId === doc.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          As conversas salvas podem ser consultadas usando o botão de livro no campo de mensagem.
        </p>
      </div>

      {/* Confirm Delete Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmModal({ show: false, id: '', title: '' })}
          />

          <div className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl p-6 ${
            isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Remover conversa
            </h3>

            <p className={`text-sm mb-6 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              Tem certeza que deseja remover "{confirmModal.title}" da base de conhecimento?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, id: '', title: '' })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                Cancelar
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
