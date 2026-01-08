/**
 * DocumentEditor Component
 * TipTap-based rich text editor with slash commands and auto-save
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { toast } from 'sonner';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Save,
  Check,
  Loader2,
  AlertCircle,
  AlignJustify,
  ChevronDown,
  FileCode,
  BookTemplate,
  History,
  Maximize2,
  Minimize2,
  X,
  Table as TableIcon,
  Copy,
} from 'lucide-react';
import type { JSONContent } from '@tiptap/react';
import type { SaveStatus, LeadDocument, LeadDocumentVersion } from '../../types/documents';
import { SlashCommands } from './SlashCommands';
import { ExportMenu } from './ExportMenu';
import { VersionHistory } from './VersionHistory';

// Tipos para espaçamento de linha
type LineSpacing = 'compact' | 'normal' | 'relaxed' | 'loose';

const LINE_SPACING_OPTIONS: { value: LineSpacing; label: string; multiplier: number }[] = [
  { value: 'compact', label: 'Compacto', multiplier: 1.2 },
  { value: 'normal', label: 'Normal', multiplier: 1.6 },
  { value: 'relaxed', label: 'Confortável', multiplier: 2.0 },
  { value: 'loose', label: 'Espaçoso', multiplier: 2.5 },
];

const STORAGE_KEY = 'document-editor-line-spacing';
const MARKDOWN_PASTE_KEY = 'document-editor-markdown-paste';

// Global state for markdown paste (accessed by extension)
let isMarkdownPasteEnabled = typeof window !== 'undefined'
  ? localStorage.getItem(MARKDOWN_PASTE_KEY) !== 'false'
  : true;

/**
 * Extension to convert Markdown syntax when pasting
 * Priority is set high (1000) to handle paste before other extensions
 */
const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  priority: 1000, // High priority to handle paste before StarterKit

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste(view, event) {
            // Re-read the global state on every paste to ensure we get the current value
            const currentEnabled = typeof window !== 'undefined'
              ? localStorage.getItem(MARKDOWN_PASTE_KEY) !== 'false'
              : isMarkdownPasteEnabled;

            console.log('[MarkdownPaste] handlePaste triggered');
            console.log('[MarkdownPaste] Global enabled:', isMarkdownPasteEnabled);
            console.log('[MarkdownPaste] LocalStorage enabled:', currentEnabled);

            // Check if markdown paste is enabled (read directly from localStorage for accuracy)
            if (!currentEnabled) {
              console.log('[MarkdownPaste] Feature disabled, skipping');
              return false;
            }

            // Get both plain text and HTML to debug
            const text = event.clipboardData?.getData('text/plain');
            const html = event.clipboardData?.getData('text/html');
            console.log('[MarkdownPaste] Clipboard types:', event.clipboardData?.types);
            console.log('[MarkdownPaste] Pasted text (plain):', text?.substring(0, 200));
            console.log('[MarkdownPaste] Pasted text char codes (first 30):', text?.substring(0, 30).split('').map(c => c.charCodeAt(0)));
            console.log('[MarkdownPaste] Pasted HTML:', html?.substring(0, 200));

            if (!text) {
              console.log('[MarkdownPaste] No text found');
              return false;
            }

            // Skip if content looks like HTML/code (has HTML tags)
            const hasHtmlTags = /<[a-zA-Z][^>]*>/.test(text);
            const hasJsImports = /^import\s/.test(text);
            const hasJsDeclarations = /^const\s|^let\s|^var\s/.test(text);
            const hasFunctions = /function\s*\(/.test(text);
            const hasJsonLike = /^\s*{[\s\S]*}[\s\S]*$/.test(text);
            const hasHtmlDoctype = text.includes('<!DOCTYPE');
            const hasHtmlTag = text.includes('<html');
            const hasStyleTag = text.includes('<style');
            const hasScriptTag = text.includes('<script');

            console.log('[MarkdownPaste] Code detection:', {
              hasHtmlTags,
              hasJsImports,
              hasJsDeclarations,
              hasFunctions,
              hasJsonLike,
              hasHtmlDoctype,
              hasHtmlTag,
              hasStyleTag,
              hasScriptTag
            });

            const looksLikeCode =
              hasHtmlTags || hasJsImports || hasJsDeclarations || hasFunctions ||
              hasJsonLike || hasHtmlDoctype || hasHtmlTag || hasStyleTag || hasScriptTag;

            if (looksLikeCode) {
              console.log('[MarkdownPaste] Skipping - looks like code/HTML');
              return false; // Let default paste handle it
            }

            // Check if text contains markdown patterns
            const hasHeader = /^#{1,6}\s/m.test(text);
            const hasBulletList = /^[-*]\s[^\s]/m.test(text);
            const hasOrderedList = /^\d+\.\s/m.test(text);
            const hasBlockquote = /^>\s/m.test(text);
            const hasBold = /\*\*[^*]+\*\*/.test(text);
            const hasStrike = /~~[^~]+~~/.test(text);
            const hasHr = /^---$/m.test(text);
            // Detectar tabela: pelo menos 2 linhas com pipe
            const pipeLines = text.split('\n').filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
            const hasTable = pipeLines.length >= 2;

            console.log('[MarkdownPaste] Pattern detection:', {
              hasHeader,
              hasBulletList,
              hasOrderedList,
              hasBlockquote,
              hasBold,
              hasStrike,
              hasHr,
              hasTable
            });

            const hasMarkdown = hasHeader || hasBulletList || hasOrderedList ||
                               hasBlockquote || hasBold || hasStrike || hasHr || hasTable;

            if (!hasMarkdown) {
              console.log('[MarkdownPaste] Skipping - no markdown patterns found');
              return false; // Let default paste handle it
            }

            console.log('[MarkdownPaste] Converting markdown to TipTap JSON');

            // Convert markdown to TipTap JSON and insert
            const editor = extensionThis.editor;
            if (editor) {
              event.preventDefault();
              const content = convertMarkdownToTipTap(text);
              console.log('[MarkdownPaste] Converted content:', JSON.stringify(content, null, 2));
              editor.chain().focus().insertContent(content).run();
              return true;
            }

            console.log('[MarkdownPaste] No editor found');
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Convert Markdown to TipTap JSON content
 */
function convertMarkdownToTipTap(markdown: string): JSONContent[] {
  // Pré-processar tabelas: remover linhas vazias entre linhas de tabela
  const preprocessedMarkdown = markdown.replace(/(\|.*\|)\s*\n\s*\n\s*(\|)/g, '$1\n$2');

  const lines = preprocessedMarkdown.split('\n');
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      i++;
      continue;
    }

    // Horizontal rule (mas não linha separadora de tabela)
    if ((/^---$/.test(trimmedLine) || /^\*\*\*$/.test(trimmedLine)) && !/^\|[\s:-]+\|$/.test(trimmedLine)) {
      content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // Headers
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      content.push({
        type: 'heading',
        attrs: { level: Math.min(level, 3) as 1 | 2 | 3 },
        content: parseInlineMarkdown(headerMatch[2]),
      });
      i++;
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().substring(2));
        i++;
      }
      content.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: parseInlineMarkdown(quoteLines.join(' ')),
        }],
      });
      continue;
    }

    // Unordered list (- or *)
    if (/^[-*]\s/.test(trimmedLine)) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s/, '');
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarkdown(itemText),
          }],
        });
        i++;
      }
      content.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmedLine)) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarkdown(itemText),
          }],
        });
        i++;
      }
      content.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // Markdown table (| Header 1 | Header 2 |)
    if (/^\|.*\|/.test(trimmedLine)) {
      const tableLines: string[] = [];
      let j = i;

      // Coletar todas as linhas da tabela (incluindo com espaços em branco entre elas)
      while (j < lines.length) {
        const currentLine = lines[j].trim();

        // Se for linha vazia, pular e continuar procurando
        if (currentLine === '') {
          j++;
          continue;
        }

        // Se for linha de tabela, adicionar
        if (/^\|.*\|/.test(currentLine)) {
          tableLines.push(currentLine);
          j++;
        } else {
          // Encontrou linha que não é tabela, parar
          break;
        }
      }

      i = j; // Atualizar índice principal

      if (tableLines.length >= 2) {
        // Parse table rows, removendo separador (|---|---|) - verifica se todas as células são apenas traços
        const rows = tableLines.filter(line => {
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          const isSeparator = cells.every(cell => /^[-:]+$/.test(cell));
          return !isSeparator;
        });

        const tableRows: JSONContent[] = [];
        rows.forEach((row, rowIndex) => {
          const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
          const cellsContent: JSONContent[] = cells.map(cellText => {
            // Se célula vazia, usar espaço para evitar erro de empty text node
            const content = cellText === '' ? ' ' : cellText;
            return {
              type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
              content: [{
                type: 'paragraph',
                content: parseInlineMarkdown(content),
              }],
            };
          });

          tableRows.push({
            type: 'tableRow',
            content: cellsContent,
          });
        });

        content.push({
          type: 'table',
          content: tableRows,
        });
        continue;
      }
    }

    // Regular paragraph
    content.push({
      type: 'paragraph',
      content: parseInlineMarkdown(trimmedLine),
    });
    i++;
  }

  return content;
}

/**
 * Parse inline markdown (bold, italic, strikethrough, code)
 */
function parseInlineMarkdown(text: string): JSONContent[] {
  const result: JSONContent[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      result.push({
        type: 'text',
        text: boldMatch[1],
        marks: [{ type: 'bold' }],
      });
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      result.push({
        type: 'text',
        text: strikeMatch[1],
        marks: [{ type: 'strike' }],
      });
      remaining = remaining.substring(strikeMatch[0].length);
      continue;
    }

    // Italic *text* (not preceded by *)
    const italicMatch = remaining.match(/^\*([^*]+?)\*/);
    if (italicMatch) {
      result.push({
        type: 'text',
        text: italicMatch[1],
        marks: [{ type: 'italic' }],
      });
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Inline code `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      result.push({
        type: 'text',
        text: codeMatch[1],
        marks: [{ type: 'code' }],
      });
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // Find next special character
    const nextSpecial = remaining.search(/[\*~`]/);
    if (nextSpecial === -1) {
      // No more special characters, add rest as plain text
      if (remaining.length > 0) {
        result.push({ type: 'text', text: remaining });
      }
      break;
    } else if (nextSpecial === 0) {
      // Special character at start but didn't match any pattern, treat as plain text
      result.push({ type: 'text', text: remaining[0] });
      remaining = remaining.substring(1);
    } else {
      // Add text before special character
      result.push({ type: 'text', text: remaining.substring(0, nextSpecial) });
      remaining = remaining.substring(nextSpecial);
    }
  }

  return result.length > 0 ? result : [{ type: 'text', text: '' }];
}

/**
 * Convert TipTap JSON to Markdown
 */
function convertTipTapToMarkdown(content: JSONContent): string {
  if (!content.content) return '';

  return content.content.map(node => {
    switch (node.type) {
      case 'heading':
        const level = node.attrs?.level || 1;
        const headingText = node.content?.map(n => n.text || '').join('') || '';
        return '#'.repeat(level) + ' ' + headingText;

      case 'paragraph':
        return node.content?.map(n => {
          let text = n.text || '';
          if (n.marks) {
            n.marks.forEach(mark => {
              if (mark.type === 'bold') text = `**${text}**`;
              if (mark.type === 'italic') text = `*${text}*`;
              if (mark.type === 'strike') text = `~~${text}~~`;
              if (mark.type === 'code') text = `\`${text}\``;
            });
          }
          return text;
        }).join('') || '';

      case 'bulletList':
        return node.content?.map(item =>
          '- ' + (item.content?.[0]?.content?.map(n => n.text || '').join('') || '')
        ).join('\n') || '';

      case 'orderedList':
        return node.content?.map((item, idx) =>
          `${idx + 1}. ` + (item.content?.[0]?.content?.map(n => n.text || '').join('') || '')
        ).join('\n') || '';

      case 'blockquote':
        return '> ' + (node.content?.map(n =>
          n.content?.map(c => c.text || '').join('') || ''
        ).join('\n> ') || '');

      case 'codeBlock':
        return '```\n' + (node.content?.map(n => n.text || '').join('\n') || '') + '\n```';

      case 'horizontalRule':
        return '---';

      case 'table':
        const rows = node.content || [];
        const markdownRows: string[] = [];

        rows.forEach((row, rowIndex) => {
          const cells = row.content || [];
          const cellTexts = cells.map(cell =>
            cell.content?.[0]?.content?.map((n: any) => n.text || '').join('') || ''
          );
          markdownRows.push('| ' + cellTexts.join(' | ') + ' |');

          // Add separator after first row (header)
          if (rowIndex === 0) {
            markdownRows.push('|' + cellTexts.map(() => '---').join('|') + '|');
          }
        });

        return markdownRows.join('\n');

      case 'taskList':
        return node.content?.map(item => {
          const checked = item.attrs?.checked ? '[x]' : '[ ]';
          const text = item.content?.[0]?.content?.map(n => n.text || '').join('') || '';
          return `- ${checked} ${text}`;
        }).join('\n') || '';

      default:
        return '';
    }
  }).filter(line => line !== '').join('\n\n');
}

interface DocumentEditorProps {
  document: LeadDocument;
  theme?: 'dark' | 'light';
  onSave: (content: JSONContent) => void;
  saveStatus: SaveStatus;
  onSaveStatusChange?: (status: SaveStatus) => void;
  workspaceId?: string;
  userId?: string;
  onSaveAsTemplate?: () => void;
  onRestoreVersion?: (version: LeadDocumentVersion) => void;
  onBack?: () => void;
  onTitleChange?: (newTitle: string) => void;
  startExpanded?: boolean;
}

export function DocumentEditor({
  document,
  theme = 'dark',
  onSave,
  saveStatus,
  onSaveStatusChange,
  workspaceId,
  userId,
  onSaveAsTemplate,
  onRestoreVersion,
  onBack,
  onTitleChange,
  startExpanded = false,
}: DocumentEditorProps) {
  const isDark = theme === 'dark';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  // Title editing state
  const [editingTitle, setEditingTitle] = useState(document.title);

  // Update title when document changes
  useEffect(() => {
    setEditingTitle(document.title);
  }, [document.title]);

  // Expanded mode (Google Docs style) - start expanded if prop is true
  const [isExpanded, setIsExpanded] = useState(startExpanded);

  // Handler to close expanded mode - calls onBack if provided
  const handleCloseExpanded = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      setIsExpanded(false);
    }
  }, [onBack]);

  // Handle title change with debounce (2 segundos)
  const handleTitleChange = useCallback((newTitle: string) => {
    setEditingTitle(newTitle);

    // Limpar timeout anterior
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    // Agendar atualização após 2 segundos de inatividade
    titleTimeoutRef.current = setTimeout(() => {
      onTitleChange?.(newTitle);
    }, 2000);
  }, [onTitleChange]);

  // Cleanup do timeout ao desmontar
  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, []);

  // Line spacing state - load from localStorage
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['compact', 'normal', 'relaxed', 'loose'].includes(saved)) {
        return saved as LineSpacing;
      }
    }
    return 'normal';
  });
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const spacingMenuRef = useRef<HTMLDivElement>(null);
  const spacingButtonRef = useRef<HTMLButtonElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);

  // Markdown paste state - load from localStorage
  const [markdownPasteActive, setMarkdownPasteActive] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MARKDOWN_PASTE_KEY) !== 'false';
    }
    return true;
  });

  // Version history modal state
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Get current line height multiplier
  const currentLineHeight = LINE_SPACING_OPTIONS.find(opt => opt.value === lineSpacing)?.multiplier || 1.6;

  // Toggle markdown paste and save to localStorage
  const toggleMarkdownPaste = () => {
    const newValue = !markdownPasteActive;
    setMarkdownPasteActive(newValue);
    isMarkdownPasteEnabled = newValue; // Update global state for extension
    localStorage.setItem(MARKDOWN_PASTE_KEY, newValue.toString());
  };

  // Save line spacing preference to localStorage
  const handleLineSpacingChange = (spacing: LineSpacing) => {
    setLineSpacing(spacing);
    localStorage.setItem(STORAGE_KEY, spacing);
    setShowSpacingMenu(false);
  };

  // Toggle spacing menu and calculate position
  const toggleSpacingMenu = () => {
    if (!showSpacingMenu && spacingButtonRef.current) {
      const rect = spacingButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setShowSpacingMenu(!showSpacingMenu);
  };

  // Close spacing menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (spacingMenuRef.current && !spacingMenuRef.current.contains(event.target as Node)) {
        setShowSpacingMenu(false);
      }
    };

    if (showSpacingMenu) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpacingMenu]);

  const editor = useEditor({
    extensions: [
      // MarkdownPaste first with high priority to handle paste before other extensions
      MarkdownPaste,
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Digite / para comandos...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight,
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
      SlashCommands,
    ],
    content: document.content,
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const contentString = JSON.stringify(json);

      // Only save if content actually changed
      if (contentString !== lastContentRef.current) {
        lastContentRef.current = contentString;

        // Mark as unsaved
        onSaveStatusChange?.('unsaved');

        // Debounced auto-save (2 seconds)
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          onSave(json);
        }, 2000);
      }
    },
  });

  // Update editor content when document changes
  useEffect(() => {
    if (editor && document.content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(document.content);

      if (currentContent !== newContent) {
        editor.commands.setContent(document.content);
        lastContentRef.current = newContent;
      }
    }
  }, [editor, document.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleManualSave = useCallback(() => {
    if (editor) {
      const json = editor.getJSON();
      onSave(json);
    }
  }, [editor, onSave]);

  // Handle version restore
  const handleRestoreVersion = useCallback((version: LeadDocumentVersion) => {
    if (editor && version.content) {
      // Set editor content to version content
      editor.commands.setContent(version.content);
      lastContentRef.current = JSON.stringify(version.content);

      // Save the restored content
      onSave(version.content);

      // Close the modal
      setShowVersionHistory(false);

      // Call parent handler if provided
      onRestoreVersion?.(version);
    }
  }, [editor, onSave, onRestoreVersion]);

  // Copy content as Markdown
  const handleCopyMarkdown = useCallback(() => {
    if (!editor) return;

    const content = editor.getJSON();
    const markdown = convertTipTapToMarkdown(content);

    navigator.clipboard.writeText(markdown).then(() => {
      toast.success('Conteúdo copiado em Markdown!');
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      toast.error('Erro ao copiar conteúdo');
    });
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  // If startExpanded is true and isExpanded is true, render only the expanded mode
  // This is for the "documents tab" use case where we only want fullscreen editor
  if (startExpanded && isExpanded) {
    return (
      <>
        {/* Version History Modal */}
        <VersionHistory
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          documentId={document.id}
          onRestore={handleRestoreVersion}
          theme={theme}
        />

        {/* Expanded Mode (Google Docs Style) */}
        <div
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 10002 }}
        >
          {/* Expanded Mode Header */}
          <div className={`flex items-center justify-between px-6 py-3 border-b ${
            isDark
              ? 'bg-[#1a1a1a] border-white/10'
              : 'bg-white border-gray-200'
          }`}>
            {/* Left: Back button + Editable Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseExpanded}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Voltar para lista"
              >
                <X className="w-5 h-5" />
              </button>
              {/* Editable Title */}
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={`text-lg font-semibold bg-transparent border-none outline-none max-w-md ${
                  isDark
                    ? 'text-white placeholder-white/40'
                    : 'text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Título do documento"
              />
            </div>

            {/* Center: Toolbar */}
            <div className={`flex items-center gap-1 px-4 py-1.5 rounded-lg ${
              isDark ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              {/* Text Formatting */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                isDark={isDark}
                title="Negrito (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                isDark={isDark}
                title="Itálico (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive('strike')}
                isDark={isDark}
                title="Riscado"
              >
                <Strikethrough className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Headings */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                isDark={isDark}
                title="Título 1"
              >
                <Heading1 className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                isDark={isDark}
                title="Título 2"
              >
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                isDark={isDark}
                title="Título 3"
              >
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Lists */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                isDark={isDark}
                title="Lista com bullets"
              >
                <List className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                isDark={isDark}
                title="Lista numerada"
              >
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                active={editor.isActive('taskList')}
                isDark={isDark}
                title="Checklist"
              >
                <CheckSquare className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Block Elements */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                isDark={isDark}
                title="Citação"
              >
                <Quote className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                isDark={isDark}
                title="Separador"
              >
                <Minus className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                active={editor.isActive('table')}
                isDark={isDark}
                title="Inserir tabela 3x3"
              >
                <TableIcon className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Undo/Redo */}
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                isDark={isDark}
                title="Desfazer (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                isDark={isDark}
                title="Refazer (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </ToolbarButton>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Save Status */}
              <div className={`flex items-center gap-2 text-xs mr-2 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Salvando...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">Salvo</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">Erro</span>
                  </>
                )}
              </div>

              {/* Version History Button */}
              <ToolbarButton
                onClick={() => setShowVersionHistory(true)}
                isDark={isDark}
                title="Histórico de Versões"
              >
                <History className="w-4 h-4" />
              </ToolbarButton>

              {/* Save as Template Button */}
              {onSaveAsTemplate && (
                <ToolbarButton
                  onClick={onSaveAsTemplate}
                  isDark={isDark}
                  title="Salvar como Template"
                >
                  <BookTemplate className="w-4 h-4" />
                </ToolbarButton>
              )}

              {/* Export Menu */}
              <ExportMenu
                documentTitle={editingTitle}
                content={editor.getJSON()}
                getContent={() => editor.getJSON()}
                editor={editor}
                editorElement={editorContentRef.current?.querySelector('.tiptap') as HTMLElement}
                theme={theme}
                onCopyMarkdown={handleCopyMarkdown}
              />

              {/* Save Button */}
              <button
                onClick={handleManualSave}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                onClick={handleCloseExpanded}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Fechar"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded Mode Content - A4 Paper Style */}
          <div
            ref={editorContentRef}
            className={`flex-1 overflow-auto ${
              isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100'
            }`}
          >
            <div className="flex justify-center py-8 px-4 min-h-full">
              {/* A4 Paper Container */}
              <div
                className={`w-full max-w-[816px] min-h-[1056px] shadow-2xl rounded-sm line-spacing-${lineSpacing} ${
                  isDark
                    ? 'bg-[#1e1e1e] text-white/90'
                    : 'bg-white text-gray-900'
                }`}
                style={{
                  padding: '72px 72px', // ~1 inch margins like Google Docs
                }}
              >
                <EditorContent
                  editor={editor}
                  className="expanded-editor-content"
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Regular inline mode (for backward compatibility when not using startExpanded)
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className={`flex items-center gap-1 px-4 py-2 border-b overflow-x-auto ${
        isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
      }`}>
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          isDark={isDark}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          isDark={isDark}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          isDark={isDark}
          title="Riscado"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          isDark={isDark}
          title="Código inline"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          isDark={isDark}
          title="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          isDark={isDark}
          title="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          isDark={isDark}
          title="Título 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          isDark={isDark}
          title="Lista com bullets"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          isDark={isDark}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          isDark={isDark}
          title="Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

        {/* Block Elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          isDark={isDark}
          title="Citação"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isDark={isDark}
          title="Separador"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          isDark={isDark}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          isDark={isDark}
          title="Refazer (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

        {/* Line Spacing Dropdown Button */}
        <button
          ref={spacingButtonRef}
          onClick={toggleSpacingMenu}
          title="Espaçamento entre linhas"
          className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors ${
            isDark
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <AlignJustify className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Markdown Paste Toggle */}
        <ToolbarButton
          onClick={toggleMarkdownPaste}
          active={markdownPasteActive}
          isDark={isDark}
          title={markdownPasteActive ? "Markdown ao colar: ATIVO" : "Markdown ao colar: DESATIVADO"}
        >
          <FileCode className="w-4 h-4" />
        </ToolbarButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save Status */}
        <div className={`flex items-center gap-2 text-xs ${
          isDark ? 'text-white/50' : 'text-gray-500'
        }`}>
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Salvando...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Salvo</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-red-500">Erro ao salvar</span>
            </>
          )}
        </div>

        {/* Version History Button */}
        <ToolbarButton
          onClick={() => setShowVersionHistory(true)}
          isDark={isDark}
          title="Histórico de Versões"
        >
          <History className="w-4 h-4" />
        </ToolbarButton>

        {/* Save as Template Button */}
        {onSaveAsTemplate && (
          <ToolbarButton
            onClick={onSaveAsTemplate}
            isDark={isDark}
            title="Salvar como Template"
          >
            <BookTemplate className="w-4 h-4" />
          </ToolbarButton>
        )}

        {/* Export Menu */}
        <ExportMenu
          documentTitle={document.title}
          content={editor.getJSON()}
          getContent={() => editor.getJSON()}
          editor={editor}
          editorElement={editorContentRef.current?.querySelector('.tiptap') as HTMLElement}
          theme={theme}
          onCopyMarkdown={handleCopyMarkdown}
        />

        {/* Manual Save Button */}
        <ToolbarButton
          onClick={handleManualSave}
          isDark={isDark}
          title="Salvar (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
        </ToolbarButton>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

        {/* Expand Button */}
        <ToolbarButton
          onClick={() => setIsExpanded(true)}
          isDark={isDark}
          title="Expandir (modo tela cheia)"
        >
          <Maximize2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div
        ref={editorContentRef}
        className={`flex-1 overflow-y-auto p-4 line-spacing-${lineSpacing} ${
          isDark ? 'bg-elevated' : 'bg-white'
        }`}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Line Spacing Floating Menu */}
      {showSpacingMenu && (
        <div
          ref={spacingMenuRef}
          className={`fixed py-1 rounded-lg shadow-xl min-w-[140px] ${
            isDark ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-gray-200'
          }`}
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999,
          }}
        >
          <div className={`px-3 py-1.5 text-xs font-medium ${
            isDark ? 'text-white/40' : 'text-gray-400'
          }`}>
            Espaçamento
          </div>
          {LINE_SPACING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleLineSpacingChange(option.value)}
              className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between transition-colors ${
                lineSpacing === option.value
                  ? isDark
                    ? 'bg-white/10 text-white'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                  ? 'text-white/70 hover:bg-white/5'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{option.label}</span>
              {lineSpacing === option.value && (
                <Check className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Version History Modal */}
      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        documentId={document.id}
        onRestore={handleRestoreVersion}
        theme={theme}
      />

      {/* Expanded Mode (Google Docs Style) */}
      {isExpanded && (
        <div
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 10002 }}
        >
          {/* Expanded Mode Header */}
          <div className={`flex items-center justify-between px-6 py-3 border-b ${
            isDark
              ? 'bg-[#1a1a1a] border-white/10'
              : 'bg-white border-gray-200'
          }`}>
            {/* Left: Back button + Editable Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseExpanded}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Voltar para lista"
              >
                <X className="w-5 h-5" />
              </button>
              {/* Editable Title */}
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={`text-lg font-semibold bg-transparent border-none outline-none max-w-md ${
                  isDark
                    ? 'text-white placeholder-white/40'
                    : 'text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Título do documento"
              />
            </div>

            {/* Center: Toolbar */}
            <div className={`flex items-center gap-1 px-4 py-1.5 rounded-lg ${
              isDark ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              {/* Text Formatting */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                isDark={isDark}
                title="Negrito (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                isDark={isDark}
                title="Itálico (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive('strike')}
                isDark={isDark}
                title="Riscado"
              >
                <Strikethrough className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Headings */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                isDark={isDark}
                title="Título 1"
              >
                <Heading1 className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                isDark={isDark}
                title="Título 2"
              >
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                isDark={isDark}
                title="Título 3"
              >
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Lists */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                isDark={isDark}
                title="Lista com bullets"
              >
                <List className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                isDark={isDark}
                title="Lista numerada"
              >
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                active={editor.isActive('taskList')}
                isDark={isDark}
                title="Checklist"
              >
                <CheckSquare className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Block Elements */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                isDark={isDark}
                title="Citação"
              >
                <Quote className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                isDark={isDark}
                title="Separador"
              >
                <Minus className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                active={editor.isActive('table')}
                isDark={isDark}
                title="Inserir tabela 3x3"
              >
                <TableIcon className="w-4 h-4" />
              </ToolbarButton>

              <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />

              {/* Undo/Redo */}
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                isDark={isDark}
                title="Desfazer (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                isDark={isDark}
                title="Refazer (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </ToolbarButton>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Save Status */}
              <div className={`flex items-center gap-2 text-xs mr-2 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Salvando...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">Salvo</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">Erro</span>
                  </>
                )}
              </div>

              {/* Version History Button */}
              <ToolbarButton
                onClick={() => setShowVersionHistory(true)}
                isDark={isDark}
                title="Histórico de Versões"
              >
                <History className="w-4 h-4" />
              </ToolbarButton>

              {/* Export Menu */}
              <ExportMenu
                documentTitle={document.title}
                content={editor.getJSON()}
                getContent={() => editor.getJSON()}
                editor={editor}
                editorElement={editorContentRef.current?.querySelector('.tiptap') as HTMLElement}
                theme={theme}
              />

              {/* Save Button */}
              <button
                onClick={handleManualSave}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
              </button>

              {/* Close/Minimize Button */}
              <button
                onClick={handleCloseExpanded}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Fechar"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded Mode Content - A4 Paper Style */}
          <div className={`flex-1 overflow-auto ${
            isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100'
          }`}>
            <div className="flex justify-center py-8 px-4 min-h-full">
              {/* A4 Paper Container */}
              <div
                className={`w-full max-w-[816px] min-h-[1056px] shadow-2xl rounded-sm line-spacing-${lineSpacing} ${
                  isDark
                    ? 'bg-[#1e1e1e] text-white/90'
                    : 'bg-white text-gray-900'
                }`}
                style={{
                  padding: '72px 72px', // ~1 inch margins like Google Docs
                }}
              >
                <EditorContent
                  editor={editor}
                  className="expanded-editor-content"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  isDark: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  isDark,
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
          ? isDark
            ? 'bg-white/20 text-white'
            : 'bg-blue-100 text-blue-600'
          : isDark
          ? 'text-white/60 hover:text-white hover:bg-white/10'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

export default DocumentEditor;
