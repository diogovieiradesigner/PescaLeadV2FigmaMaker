/**
 * Página Pública de Documento
 *
 * Permite visualização e edição de documentos compartilhados publicamente.
 * - Visualização: Acesso livre para ler, copiar markdown, baixar PDF
 * - Edição: Requer senha de 4 dígitos
 *
 * Usa os mesmos estilos do DocumentEditor (globals.css) para consistência visual.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import {
  FileText,
  Check,
  Lock,
  Eye,
  Edit3,
  Loader2,
  AlertCircle,
  X,
  Save,
  Clock,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table as TableIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPublicDocument,
  verifyEditPassword,
  savePublicDocument,
  contentToMarkdown,
  extractTextFromContent,
} from '../services/documents-service';
import type { PublicDocumentData } from '../types/documents';
import { ExportMenu } from '../components/documents/ExportMenu';

// Import global styles (includes tiptap-editor and expanded-editor-content)
import '../styles/globals.css';

// ============================================
// TOOLBAR BUTTON
// ============================================

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : active
          ? 'bg-white/20 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

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
      <div className="bg-[#1e1e1e] rounded-xl shadow-2xl max-w-sm w-full p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Modo Editor</h3>
              <p className="text-sm text-white/60">Digite a senha de 4 dígitos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors"
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
              className="w-14 h-14 text-center text-2xl font-bold bg-white/10 border-2 border-white/20 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all text-white"
              autoFocus={index === 0}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 justify-center">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-blue-400">
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
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [document, setDocument] = useState<PublicDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editPassword, setEditPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs para debounce do salvamento automático
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);

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

  // Editor TipTap - mesmas extensões do DocumentEditor
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
      Typography,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: document?.content || { type: 'doc', content: [] },
    editable: isEditMode,
    editorProps: {
      attributes: {
        // Usa a mesma classe do DocumentEditor para herdar estilos do globals.css
        class: 'tiptap-editor focus:outline-none',
      },
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

  // Função de salvar documento
  const handleSave = useCallback(async () => {
    if (!slug || !editor || !editPassword) return;

    // Evita salvar se já está salvando
    if (saveStatus === 'saving') {
      pendingSaveRef.current = true;
      return;
    }

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
      setLastSavedAt(new Date());

      // Se houve mudanças durante o salvamento, salva novamente
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        setTimeout(() => handleSave(), 500);
      }
    } else {
      console.error('Error saving:', error);
      setSaveStatus('unsaved');
      toast.error('Erro ao salvar documento');
    }
  }, [slug, editor, editPassword, saveStatus]);

  // Salvamento automático com debounce (1.5 segundos após última digitação)
  const debouncedSave = useCallback(() => {
    // Limpa timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Só salva automaticamente se tiver senha (modo edição autorizado)
    if (!editPassword) return;

    // Agenda novo salvamento
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1500);
  }, [editPassword, handleSave]);

  // Handler de update do editor para salvamento automático
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (isEditMode && editPassword) {
        setSaveStatus('unsaved');
        debouncedSave();
      }
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, isEditMode, editPassword, debouncedSave]);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Copiar conteúdo como Markdown
  const handleCopyMarkdown = useCallback(() => {
    if (!editor) return;

    const content = editor.getJSON();
    const markdown = contentToMarkdown(content);

    navigator.clipboard.writeText(markdown).then(() => {
      toast.success('Conteúdo copiado em Markdown!');
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      toast.error('Erro ao copiar conteúdo');
    });
  }, [editor]);

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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white/60">Carregando documento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !document) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Documento não encontrado
          </h1>
          <p className="text-white/60">
            {error || 'Este link pode ter expirado ou o documento foi removido.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a2a2a]">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-[900px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-white truncate">
                  {document.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Clock className="w-3 h-3" />
                  <span>Atualizado em {formatDate(document.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Save status (edit mode) - igual ao DocumentEditor */}
              {isEditMode && (
                <div className="flex items-center gap-2 mr-2">
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-white/50 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-green-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvo</span>
                      {lastSavedAt && (
                        <span className="text-white/40 ml-1">
                          {lastSavedAt.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <button
                      onClick={handleSave}
                      className="text-xs text-amber-400 flex items-center gap-1.5 hover:text-amber-300 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar alterações</span>
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
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
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

              {/* Export Menu - mesmo componente do DocumentEditor */}
              <ExportMenu
                documentTitle={document.title}
                content={document.content}
                editor={editor}
                theme="dark"
                onCopyMarkdown={handleCopyMarkdown}
              />
            </div>
          </div>
        </div>

        {/* Formatting Toolbar - só aparece no modo de edição */}
        {isEditMode && editor && (
          <div className="border-t border-white/10 bg-[#1a1a1a]">
            <div className="max-w-[900px] mx-auto px-4 py-2">
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {/* Text Formatting */}
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  active={editor.isActive('bold')}
                  title="Negrito (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  active={editor.isActive('italic')}
                  title="Itálico (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  active={editor.isActive('strike')}
                  title="Riscado"
                >
                  <Strikethrough className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px h-5 mx-1 bg-white/10" />

                {/* Headings */}
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  active={editor.isActive('heading', { level: 1 })}
                  title="Título 1"
                >
                  <Heading1 className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  active={editor.isActive('heading', { level: 2 })}
                  title="Título 2"
                >
                  <Heading2 className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  active={editor.isActive('heading', { level: 3 })}
                  title="Título 3"
                >
                  <Heading3 className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px h-5 mx-1 bg-white/10" />

                {/* Lists */}
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  active={editor.isActive('bulletList')}
                  title="Lista com bullets"
                >
                  <List className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  active={editor.isActive('orderedList')}
                  title="Lista numerada"
                >
                  <ListOrdered className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                  active={editor.isActive('taskList')}
                  title="Checklist"
                >
                  <CheckSquare className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px h-5 mx-1 bg-white/10" />

                {/* Block Elements */}
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  active={editor.isActive('blockquote')}
                  title="Citação"
                >
                  <Quote className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  title="Separador"
                >
                  <Minus className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  active={editor.isActive('table')}
                  title="Inserir tabela 3x3"
                >
                  <TableIcon className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px h-5 mx-1 bg-white/10" />

                {/* Undo/Redo */}
                <ToolbarButton
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                </ToolbarButton>

                <ToolbarButton
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  title="Refazer (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                </ToolbarButton>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Editor - Estilo A4 como no DocumentEditor expandido */}
      <main className="flex justify-center py-8 px-4 min-h-[calc(100vh-120px)]">
        {/* A4 Paper Container - mesmas dimensões do DocumentEditor */}
        <div
          ref={editorContainerRef}
          className={`w-full max-w-[816px] min-h-[1056px] shadow-2xl rounded-sm bg-[#1e1e1e] text-white/90 line-spacing-normal ${
            isEditMode ? 'ring-2 ring-blue-500/50' : ''
          }`}
          style={{
            padding: '72px 72px', // ~1 inch margins like Google Docs
          }}
        >
          {/*
            Usando expanded-editor-content para herdar os estilos do globals.css
            que são os mesmos usados no DocumentEditor
          */}
          <EditorContent
            editor={editor}
            className="expanded-editor-content"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] border-t border-white/10 py-4">
        <div className="max-w-[900px] mx-auto px-4 text-center text-sm text-white/50">
          <span>Compartilhado via </span>
          <a
            href="https://pescalead.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium"
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
