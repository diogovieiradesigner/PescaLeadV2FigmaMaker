/**
 * Export Menu Component
 * Provides options to export documents to PDF or Markdown
 */

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileCode2, ChevronDown } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';
import { contentToMarkdown } from '../../services/documents-service';
import type { Editor } from '@tiptap/react';

interface ExportMenuProps {
  documentTitle: string;
  content: JSONContent;
  getContent?: () => JSONContent; // Function to get fresh content
  editor?: Editor | null; // Direct editor reference for getText()
  editorElement?: HTMLElement | null; // Keep for backwards compatibility but no longer used
  theme?: 'dark' | 'light';
}

export function ExportMenu({ documentTitle, content, getContent, editor, theme = 'dark' }: ExportMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDark = theme === 'dark';

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Calculate menu position when opening
  const toggleMenu = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setShowMenu(!showMenu);
  };

  // Export to Markdown
  const exportToMarkdown = () => {
    setIsExporting(true);
    try {
      // PRIORITY 1: Get content directly from editor (most reliable)
      let currentContent = editor?.getJSON();

      // PRIORITY 2: Use getContent function if editor not available
      if (!currentContent && getContent) {
        currentContent = getContent();
      }

      // PRIORITY 3: Use content prop as last resort
      if (!currentContent) {
        currentContent = content;
      }

      let bodyMarkdown = '';

      // Try to convert the content to Markdown
      if (currentContent) {
        bodyMarkdown = contentToMarkdown(currentContent);
      }

      // Fallback: if conversion returns empty but editor has text, use getText()
      if (!bodyMarkdown.trim() && editor) {
        const plainText = editor.getText();
        if (plainText.trim()) {
          // Try to add basic formatting from editor HTML
          const html = editor.getHTML();
          bodyMarkdown = htmlToBasicMarkdown(html) || plainText;
        }
      }

      // Build final markdown with title
      const markdown = `# ${documentTitle}\n\n${bodyMarkdown}`.trim();

      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sanitizeFilename(documentTitle)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowMenu(false);
    } catch (error) {
      console.error('[Export] Error exporting to Markdown:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF with selectable text
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // Dynamic import of jsPDF
      const { jsPDF } = await import('jspdf');

      // Get content - priority: editor > getContent > content prop
      let currentContent = editor?.getJSON();
      if (!currentContent && getContent) {
        currentContent = getContent();
      }
      if (!currentContent) {
        currentContent = content;
      }

      // Create PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper to add new page if needed
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Add document title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(documentTitle, maxWidth);
      checkPageBreak(titleLines.length * 8);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 5;

      // Extract text from node (handles nested content and marks)
      const extractNodeText = (node: Record<string, unknown>): string => {
        if (node.type === 'text') {
          return (node.text as string) || '';
        }
        const nodeContent = node.content as Record<string, unknown>[] | undefined;
        if (nodeContent) {
          return nodeContent.map(child => extractNodeText(child as Record<string, unknown>)).join('');
        }
        return '';
      };

      // Process TipTap content
      const processNode = (node: Record<string, unknown>, indent = 0) => {
        const type = node.type as string;
        const nodeContent = node.content as Record<string, unknown>[] | undefined;
        const attrs = node.attrs as Record<string, unknown> | undefined;

        switch (type) {
          case 'doc':
            nodeContent?.forEach(child => processNode(child as Record<string, unknown>, indent));
            break;

          case 'heading': {
            const level = (attrs?.level as number) || 1;
            const sizes = { 1: 18, 2: 16, 3: 14 };
            const fontSize = sizes[level as 1 | 2 | 3] || 14;
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'bold');
            const text = extractNodeText(node);
            const lines = doc.splitTextToSize(text, maxWidth - indent * 5);
            checkPageBreak(lines.length * (fontSize / 2.5) + 3);
            doc.text(lines, margin + indent * 5, y);
            y += lines.length * (fontSize / 2.5) + 3;
            break;
          }

          case 'paragraph': {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const text = extractNodeText(node);
            if (text.trim()) {
              const lines = doc.splitTextToSize(text, maxWidth - indent * 5);
              checkPageBreak(lines.length * 5 + 2);
              doc.text(lines, margin + indent * 5, y);
              y += lines.length * 5 + 2;
            } else {
              y += 3; // Empty paragraph spacing
            }
            break;
          }

          case 'bulletList':
          case 'orderedList': {
            nodeContent?.forEach((child, index) => {
              const itemNode = child as Record<string, unknown>;
              const itemContent = itemNode.content as Record<string, unknown>[] | undefined;
              const bullet = type === 'bulletList' ? '\u2022' : `${index + 1}.`;

              doc.setFontSize(11);
              doc.setFont('helvetica', 'normal');

              // Get text from list item
              let itemText = '';
              itemContent?.forEach(subNode => {
                itemText += extractNodeText(subNode as Record<string, unknown>);
              });

              const fullText = `${bullet} ${itemText}`;
              const lines = doc.splitTextToSize(fullText, maxWidth - (indent + 1) * 5);
              checkPageBreak(lines.length * 5 + 1);
              doc.text(lines, margin + (indent + 1) * 5, y);
              y += lines.length * 5 + 1;
            });
            y += 2;
            break;
          }

          case 'taskList': {
            nodeContent?.forEach(child => {
              const itemNode = child as Record<string, unknown>;
              const itemContent = itemNode.content as Record<string, unknown>[] | undefined;
              const itemAttrs = itemNode.attrs as Record<string, unknown> | undefined;
              const checked = itemAttrs?.checked as boolean;
              const checkbox = checked ? '[\u2713]' : '[ ]';

              doc.setFontSize(11);
              doc.setFont('helvetica', 'normal');

              let itemText = '';
              itemContent?.forEach(subNode => {
                itemText += extractNodeText(subNode as Record<string, unknown>);
              });

              const fullText = `${checkbox} ${itemText}`;
              const lines = doc.splitTextToSize(fullText, maxWidth - (indent + 1) * 5);
              checkPageBreak(lines.length * 5 + 1);
              doc.text(lines, margin + (indent + 1) * 5, y);
              y += lines.length * 5 + 1;
            });
            y += 2;
            break;
          }

          case 'blockquote': {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100);
            const text = extractNodeText(node);
            const lines = doc.splitTextToSize(`"${text}"`, maxWidth - 10);
            checkPageBreak(lines.length * 5 + 4);
            // Draw left border
            doc.setDrawColor(0, 102, 255);
            doc.setLineWidth(0.5);
            doc.line(margin + 2, y - 2, margin + 2, y + lines.length * 5);
            doc.text(lines, margin + 6, y);
            y += lines.length * 5 + 4;
            doc.setTextColor(0);
            break;
          }

          case 'codeBlock': {
            doc.setFontSize(10);
            doc.setFont('courier', 'normal');
            const text = extractNodeText(node);
            const lines = doc.splitTextToSize(text, maxWidth - 10);
            checkPageBreak(lines.length * 4.5 + 6);
            // Draw background
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y - 3, maxWidth, lines.length * 4.5 + 6, 'F');
            doc.text(lines, margin + 3, y + 1);
            y += lines.length * 4.5 + 6;
            doc.setFont('helvetica', 'normal');
            break;
          }

          case 'horizontalRule': {
            checkPageBreak(8);
            doc.setDrawColor(200);
            doc.setLineWidth(0.3);
            doc.line(margin, y + 2, pageWidth - margin, y + 2);
            y += 8;
            break;
          }

          default:
            // Try to process children
            nodeContent?.forEach(child => processNode(child as Record<string, unknown>, indent));
        }
      };

      // Process the content
      if (currentContent) {
        processNode(currentContent as Record<string, unknown>);
      }

      // Save the PDF
      doc.save(`${sanitizeFilename(documentTitle)}.pdf`);
      setShowMenu(false);
    } catch (error) {
      console.error('[Export] Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        disabled={isExporting}
        title="Exportar documento"
        className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors ${
          isDark
            ? 'text-white/60 hover:text-white hover:bg-white/10'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Download className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className={`fixed py-1 rounded-lg shadow-xl min-w-[160px] ${
            isDark ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-gray-200'
          }`}
          style={{
            top: menuPosition.top,
            right: menuPosition.right,
            zIndex: 9999,
          }}
        >
          <div className={`px-3 py-1.5 text-xs font-medium ${
            isDark ? 'text-white/40' : 'text-gray-400'
          }`}>
            Exportar como
          </div>

          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
              isDark
                ? 'text-white/70 hover:bg-white/5 hover:text-white'
                : 'text-gray-700 hover:bg-gray-50'
            } ${isExporting ? 'opacity-50' : ''}`}
          >
            <FileText className="w-4 h-4 text-red-500" />
            PDF (.pdf)
          </button>

          <button
            onClick={exportToMarkdown}
            disabled={isExporting}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
              isDark
                ? 'text-white/70 hover:bg-white/5 hover:text-white'
                : 'text-gray-700 hover:bg-gray-50'
            } ${isExporting ? 'opacity-50' : ''}`}
          >
            <FileCode2 className="w-4 h-4 text-blue-500" />
            Markdown (.md)
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100) // Limit length
    || 'documento';
}

/**
 * Convert HTML to basic Markdown (fallback for when JSON conversion fails)
 */
function htmlToBasicMarkdown(html: string): string {
  let md = html;

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // Bold and italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');

  // Code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n');

  // Lists - process list items first
  md = md.replace(/<li[^>]*>\s*<p[^>]*>(.*?)<\/p>\s*<\/li>/gi, '- $1\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

  // Task items (checkboxes)
  md = md.replace(/<li[^>]*data-checked="true"[^>]*>(.*?)<\/li>/gi, '- [x] $1\n');
  md = md.replace(/<li[^>]*data-checked="false"[^>]*>(.*?)<\/li>/gi, '- [ ] $1\n');

  // Remove list wrappers
  md = md.replace(/<\/?ul[^>]*>/gi, '\n');
  md = md.replace(/<\/?ol[^>]*>/gi, '\n');

  // Blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = content.replace(/<\/?p[^>]*>/gi, '').split('\n');
    return lines.map((line: string) => `> ${line.trim()}`).join('\n') + '\n\n';
  });

  // Horizontal rule
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n\n');

  // Paragraphs and line breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<br[^>]*\/?>/gi, '\n');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

export default ExportMenu;
