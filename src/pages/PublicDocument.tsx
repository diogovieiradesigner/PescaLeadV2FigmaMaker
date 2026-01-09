/**
 * Página Pública de Documento
 *
 * Permite visualização e edição de documentos compartilhados publicamente.
 * - Visualização: Acesso livre para ler, copiar markdown, baixar PDF
 * - Edição: Requer senha de 4 dígitos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import {
  FileText,
  Download,
  Copy,
  Check,
  Lock,
  Eye,
  Edit3,
  Loader2,
  AlertCircle,
  FileDown,
  X,
  Save,
  Clock,
} from 'lucide-react';
import {
  getPublicDocument,
  verifyEditPassword,
  savePublicDocument,
  contentToMarkdown,
  extractTextFromContent,
} from '../services/documents-service';
import type { PublicDocumentData } from '../types/documents';

// ============================================
// PASSWORD MODAL
// ============================================

function PasswordModal({
  onSubmit,
  onClose,
  loading,
  error,
}: {
  onSubmit: (password: string) => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [digits, setDigits] = useState(['', '', '', '']);

  const handleDigitChange = (index: number, value: string) => {
    const newValue = value.replace(/\D/g, '').slice(0, 1);
    const newDigits = [...digits];
    newDigits[index] = newValue;
    setDigits(newDigits);

    // Auto-focus próximo input
    if (newValue && index < 3) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit quando completo
    if (index === 3 && newValue) {
      const password = newDigits.join('');
      if (password.length === 4) {
        onSubmit(password);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (paste.length === 4) {
      setDigits(paste.split(''));
      onSubmit(paste);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Modo Editor</h3>
              <p className="text-sm text-gray-500">Digite a senha de 4 dígitos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              id={`digit-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              autoFocus={index === 0}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4 justify-center">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-indigo-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verificando...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PublicDocument() {
  const { slug } = useParams<{ slug: string }>();

  const [document, setDocument] = useState<PublicDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editPassword, setEditPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [copied, setCopied] = useState(false);

  // Carregar documento
  useEffect(() => {
    async function load() {
      if (!slug) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      setLoading(true);
      const { document: doc, error: err } = await getPublicDocument(slug);

      if (err || !doc) {
        setError(err || 'Documento não encontrado');
        setLoading(false);
        return;
      }

      setDocument(doc);
      setLoading(false);
    }

    load();
  }, [slug]);

  // Editor TipTap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Comece a escrever...',
      }),
    ],
    content: document?.content || { type: 'doc', content: [] },
    editable: isEditMode,
    onUpdate: ({ editor }) => {
      if (isEditMode) {
        setSaveStatus('unsaved');
      }
    },
  });

  // Atualizar conteúdo quando documento carregar
  useEffect(() => {
    if (document?.content && editor) {
      editor.commands.setContent(document.content);
    }
  }, [document, editor]);

  // Atualizar editável quando modo mudar
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditMode);
    }
  }, [isEditMode, editor]);

  // Handlers
  const handleEnterEditMode = useCallback(() => {
    if (!document?.allow_edit) return;

    if (document.has_password) {
      setShowPasswordModal(true);
    } else {
      setIsEditMode(true);
    }
  }, [document]);

  const handlePasswordSubmit = useCallback(async (password: string) => {
    if (!slug) return;

    setPasswordLoading(true);
    setPasswordError(null);

    const { success, error } = await verifyEditPassword(slug, password);

    if (success) {
      setEditPassword(password);
      setIsEditMode(true);
      setShowPasswordModal(false);
    } else {
      setPasswordError(error || 'Senha incorreta');
    }

    setPasswordLoading(false);
  }, [slug]);

  const handleSave = useCallback(async () => {
    if (!slug || !editor || !editPassword) return;

    setSaveStatus('saving');

    const content = editor.getJSON();
    const contentText = extractTextFromContent(content);

    const { success, error } = await savePublicDocument(
      slug,
      editPassword,
      content,
      contentText
    );

    if (success) {
      setSaveStatus('saved');
    } else {
      console.error('Error saving:', error);
      setSaveStatus('unsaved');
    }
  }, [slug, editor, editPassword]);

  const handleCopyMarkdown = useCallback(async () => {
    if (!document) return;

    const markdown = contentToMarkdown(document.content);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [document]);

  const handleDownloadMarkdown = useCallback(() => {
    if (!document) return;

    const markdown = contentToMarkdown(document.content);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [document]);

  const handleDownloadPDF = useCallback(async () => {
    if (!editor) return;

    // Usar print do navegador como PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document?.title || 'Documento'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1 { font-size: 2em; margin-bottom: 0.5em; }
            h2 { font-size: 1.5em; margin-top: 1.5em; }
            h3 { font-size: 1.25em; margin-top: 1.25em; }
            p { margin: 1em 0; }
            ul, ol { margin: 1em 0; padding-left: 2em; }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 1em 0;
              padding-left: 1em;
              color: #666;
            }
            code {
              background: #f4f4f4;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: monospace;
            }
            pre {
              background: #f4f4f4;
              padding: 1em;
              border-radius: 8px;
              overflow-x: auto;
            }
            hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
            .title { font-size: 2.5em; font-weight: bold; margin-bottom: 0.5em; }
            .meta { color: #666; font-size: 0.9em; margin-bottom: 2em; }
          </style>
        </head>
        <body>
          <div class="title">${document?.title || 'Documento'}</div>
          <div class="meta">Última atualização: ${new Date(document?.updated_at || '').toLocaleDateString('pt-BR')}</div>
          <hr />
          ${editor.getHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [editor, document]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando documento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Documento não encontrado
          </h1>
          <p className="text-gray-600">
            {error || 'Este link pode ter expirado ou o documento foi removido.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-gray-900 truncate">
                  {document.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Atualizado em {formatDate(document.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Save status (edit mode) */}
              {isEditMode && (
                <div className="flex items-center gap-2 mr-2">
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Salvando...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Salvo
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <button
                      onClick={handleSave}
                      className="text-xs text-amber-600 flex items-center gap-1 hover:text-amber-700"
                    >
                      <Save className="w-3 h-3" />
                      Salvar alterações
                    </button>
                  )}
                </div>
              )}

              {/* Mode toggle */}
              {document.allow_edit && (
                <button
                  onClick={() => isEditMode ? setIsEditMode(false) : handleEnterEditMode()}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isEditMode
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Visualizar</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </>
                  )}
                </button>
              )}

              {/* Export options */}
              <div className="flex items-center">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copiar Markdown"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Baixar .md"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Baixar PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-200px)] ${
          isEditMode ? 'ring-2 ring-indigo-200' : ''
        }`}>
          <EditorContent
            editor={editor}
            className="prose prose-lg max-w-none p-8 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60vh]"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          <span>Compartilhado via </span>
          <a
            href="https://pescalead.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Pesca Lead
          </a>
        </div>
      </footer>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal
          onSubmit={handlePasswordSubmit}
          onClose={() => setShowPasswordModal(false)}
          loading={passwordLoading}
          error={passwordError}
        />
      )}
    </div>
  );
}
