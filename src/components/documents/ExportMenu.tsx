/**
 * Export Menu Component
 * Provides options to export documents to PDF or Markdown
 */

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileCode2, ChevronDown, Copy } from 'lucide-react';
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
  onCopyMarkdown?: () => void; // Callback to copy as markdown
}

export function ExportMenu({ documentTitle, content, getContent, editor, theme = 'dark', onCopyMarkdown }: ExportMenuProps) {
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

      // Sanitize text for PDF (replace Unicode chars not supported by helvetica)
      const sanitizeTextForPDF = (text: string): string => {
        return text
          .replace(/→/g, '->')    // Arrow right
          .replace(/←/g, '<-')    // Arrow left
          .replace(/↔/g, '<->')   // Arrow both
          .replace(/•/g, '*')     // Bullet (use for inline, list bullets handled separately)
          .replace(/–/g, '-')     // En dash
          .replace(/—/g, '--')    // Em dash
          .replace(/'/g, "'")     // Smart quote
          .replace(/'/g, "'")     // Smart quote
          .replace(/"/g, '"')     // Smart quote
          .replace(/"/g, '"')     // Smart quote
          .replace(/…/g, '...')   // Ellipsis
          .replace(/×/g, 'x')     // Multiplication
          .replace(/÷/g, '/')     // Division
          .replace(/≈/g, '~')     // Approximately
          .replace(/≠/g, '!=')    // Not equal
          .replace(/≤/g, '<=')    // Less or equal
          .replace(/≥/g, '>=')    // Greater or equal
          .replace(/✓/g, '[x]')   // Checkmark
          .replace(/✗/g, '[ ]')   // X mark
          .replace(/★/g, '*')     // Star
          .replace(/☆/g, '*');    // Empty star
      };

      // Extract text from node (handles nested content and marks)
      const extractNodeText = (node: Record<string, unknown>): string => {
        if (node.type === 'text') {
          const rawText = (node.text as string) || '';
          return sanitizeTextForPDF(rawText);
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
            const topPadding = { 1: 10, 2: 8, 3: 6 }; // Padding superior por nível
            const fontSize = sizes[level as 1 | 2 | 3] || 14;
            const paddingTop = topPadding[level as 1 | 2 | 3] || 6;

            // Adiciona padding superior antes do título
            y += paddingTop;

            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'bold');
            const text = extractNodeText(node);
            const lines = doc.splitTextToSize(text, maxWidth - indent * 5);
            checkPageBreak(lines.length * (fontSize / 2.5) + paddingTop + 3);
            doc.text(lines, margin + indent * 5, y);
            y += lines.length * (fontSize / 2.5) + 4;
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
            checkPageBreak(20);
            y += 8; // Padding acima da linha
            doc.setDrawColor(200);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 12; // Padding abaixo da linha (maior para separar do título)
            break;
          }

          case 'table': {
            // Process table
            const rows = nodeContent || [];
            if (rows.length === 0) break;

            // Calculate column widths based on content
            const allCells: string[][] = [];
            rows.forEach(row => {
              const rowNode = row as Record<string, unknown>;
              const cells = (rowNode.content as Record<string, unknown>[]) || [];
              const rowTexts: string[] = [];
              cells.forEach(cell => {
                const cellText = extractNodeText(cell as Record<string, unknown>);
                rowTexts.push(cellText);
              });
              allCells.push(rowTexts);
            });

            if (allCells.length === 0) break;

            const numCols = Math.max(...allCells.map(r => r.length));
            const colWidth = maxWidth / numCols;
            const cellPadding = 3;
            const lineHeight = 4;
            const minRowHeight = 8;

            // Calculate row heights based on content wrapping
            doc.setFontSize(9);
            const rowHeights: number[] = allCells.map(rowTexts => {
              let maxLines = 1;
              rowTexts.forEach(cellText => {
                const textWidth = colWidth - cellPadding * 2;
                const lines = doc.splitTextToSize(cellText, textWidth);
                maxLines = Math.max(maxLines, lines.length);
              });
              return Math.max(minRowHeight, maxLines * lineHeight + cellPadding * 2);
            });

            // Calculate total table height needed
            const tableHeight = rowHeights.reduce((sum, h) => sum + h, 0) + 4;
            checkPageBreak(Math.min(tableHeight, 100)); // Check at least first part fits

            // Draw table
            let tableY = y;
            const tableStartX = margin;

            allCells.forEach((rowTexts, rowIndex) => {
              const isHeader = rowIndex === 0;
              const currentRowHeight = rowHeights[rowIndex];

              // Check if we need a page break mid-table
              if (tableY + currentRowHeight > pageHeight - margin) {
                doc.addPage();
                tableY = margin;
              }

              // Draw row background for header
              if (isHeader) {
                doc.setFillColor(235, 235, 235);
                doc.rect(tableStartX, tableY, maxWidth, currentRowHeight, 'F');
              } else if (rowIndex % 2 === 0) {
                // Zebra striping for readability
                doc.setFillColor(250, 250, 250);
                doc.rect(tableStartX, tableY, maxWidth, currentRowHeight, 'F');
              }

              // Draw cells
              rowTexts.forEach((cellText, colIndex) => {
                const cellX = tableStartX + colIndex * colWidth;

                // Set font for header vs body
                doc.setFontSize(9);
                if (isHeader) {
                  doc.setFont('helvetica', 'bold');
                  doc.setTextColor(50, 50, 50);
                } else {
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(70, 70, 70);
                }

                // Wrap text within cell
                const textWidth = colWidth - cellPadding * 2;
                const lines = doc.splitTextToSize(cellText, textWidth);

                // Draw wrapped text
                lines.forEach((line: string, lineIndex: number) => {
                  const textY = tableY + cellPadding + lineHeight * (lineIndex + 1);
                  if (textY < tableY + currentRowHeight - 1) {
                    doc.text(line, cellX + cellPadding, textY);
                  }
                });

                // Draw cell border
                doc.setDrawColor(200);
                doc.setLineWidth(0.2);
                doc.rect(cellX, tableY, colWidth, currentRowHeight);
              });

              tableY += currentRowHeight;
            });

            // Reset text color
            doc.setTextColor(0, 0, 0);
            y = tableY + 6; // Add spacing after table
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

          {onCopyMarkdown && (
            <button
              onClick={() => {
                onCopyMarkdown();
                setShowMenu(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                isDark
                  ? 'text-white/70 hover:bg-white/5 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Copy className="w-4 h-4 text-green-500" />
              Copiar Markdown
            </button>
          )}
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
