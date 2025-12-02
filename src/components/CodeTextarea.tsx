import { useEffect, useRef, useState } from 'react';
import { Maximize2, X, GripHorizontal } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog@1.1.6';
import { Resizable } from 're-resizable';

interface CodeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  isDark: boolean;
  className?: string;
  label?: string;
}

export function CodeTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  rows = 10,
  isDark,
  className = '',
  label = 'Editar',
}: CodeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Calcular tamanho inicial do modal
  const getInitialSize = () => ({
    width: Math.floor(window.innerWidth * 0.6),
    height: Math.floor(window.innerHeight * 0.8),
  });
  
  const [modalSize, setModalSize] = useState(getInitialSize);
  
  // Resetar tamanho quando abrir o modal
  useEffect(() => {
    if (isModalOpen) {
      setModalSize(getInitialSize());
    }
  }, [isModalOpen]);
  
  // Contadores
  const charCount = value.length;
  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;

  // Atualizar números de linha quando o conteúdo mudar
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineNumbers(Array.from({ length: Math.max(lines, rows) }, (_, i) => i + 1));
  }, [value, rows]);

  // Sincronizar scroll entre números de linha, textarea e highlight
  const handleScroll = () => {
    const lineNumbersEl = document.getElementById(`line-numbers-${uniqueId.current}`);
    if (lineNumbersEl && textareaRef.current && highlightRef.current) {
      lineNumbersEl.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // ID único para este textarea
  const uniqueId = useRef(`textarea-${Math.random().toString(36).substr(2, 9)}`);

  // Paleta de cores para diferentes tags
  const tagColors = isDark
    ? [
        '#7ee787', // verde
        '#79c0ff', // azul
        '#ffa657', // laranja
        '#d2a8ff', // roxo
        '#f778ba', // rosa
        '#56d4dd', // ciano
        '#ffd700', // amarelo
      ]
    : [
        '#22863a', // verde
        '#0366d6', // azul
        '#e36209', // laranja
        '#6f42c1', // roxo
        '#d73a49', // rosa
        '#1b7c83', // ciano
        '#b08800', // amarelo
      ];

  // Função para gerar cor baseada no nome da tag
  const getTagColor = (tagName: string) => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return tagColors[Math.abs(hash) % tagColors.length];
  };

  // Syntax highlighting para tags HTML
  const highlightSyntax = (text: string) => {
    if (!text) return '';
    
    // Escapar HTML primeiro
    const escaped = text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
    
    // Colorir tags de abertura e fechamento: <tag> e </tag>
    let highlighted = escaped.replace(
      /<(\/?)[a-zA-Z0-9_-]+(?:\s[^&]*?)?>/g,
      (match, slash, tagName) => {
        const color = getTagColor(tagName);
        return `<span style="color: ${color};"><${slash}${tagName}></span>`;
      }
    );
    
    return highlighted;
  };

  const renderEditor = (isModal = false) => {
    const currentRef = isModal ? modalTextareaRef : textareaRef;
    
    return (
    <div
      className={`relative flex rounded-lg border overflow-hidden ${
        isDark
          ? 'bg-white/[0.05] border-white/[0.1]'
          : 'bg-white border-gray-200'
      } ${isModal ? 'h-full' : className}`}
    >
      {/* Números de Linha */}
      <div
        id={`line-numbers-${uniqueId.current}${isModal ? '-modal' : ''}`}
        className={`select-none overflow-hidden py-2 pr-3 pl-3 text-right font-mono text-sm ${
          isDark ? 'text-white/30 bg-white/[0.02]' : 'text-gray-400 bg-gray-50'
        }`}
        style={{
          lineHeight: '1.5',
          minWidth: '3rem',
          height: isModal ? '100%' : 'auto',
          maxHeight: isModal ? '100%' : `${rows * 1.5 * 16 + 16}px`,
        }}
      >
        {lineNumbers.map((num) => (
          <div key={num}>{num}</div>
        ))}
      </div>

      {/* Container para Textarea + Highlight Overlay */}
      <div className="relative flex-1">
        {/* Highlight Overlay (atrás do textarea) */}
        <div
          ref={highlightRef}
          className={`absolute inset-0 px-3 py-2 font-mono text-sm pointer-events-none overflow-auto whitespace-pre-wrap break-words ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
          style={{
            lineHeight: '1.5',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: highlightSyntax(value) || '<br />' }}
        />

        {/* Textarea (transparente para mostrar highlight) */}
        <textarea
          ref={currentRef}
          id={`${uniqueId.current}${isModal ? '-modal' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          rows={isModal ? 20 : rows}
          className={`relative z-10 w-full px-3 py-2 font-mono text-sm outline-none transition-colors ${
            isModal ? 'resize-none h-full' : 'resize-y'
          } ${
            isDark
              ? 'bg-transparent text-transparent caret-white placeholder-white/40 focus:ring-2 focus:ring-[#0169D9]/50'
              : 'bg-transparent text-transparent caret-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0169D9]/50'
          }`}
          style={{
            lineHeight: '1.5',
            minHeight: isModal ? '100%' : `${rows * 1.5}rem`,
            maxHeight: isModal ? '100%' : undefined,
            WebkitTextFillColor: 'transparent',
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
  };

  return (
    <>
      {/* Editor Principal */}
      <div className="relative">
        {renderEditor(false)}
        
        {/* Barra de informações e ações */}
        <div className={`flex items-center justify-between mt-1 px-1 text-xs ${
          isDark ? 'text-white/50' : 'text-gray-500'
        }`}>
          <div className="flex items-center gap-3">
            <span>{wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}</span>
            <span>&bull;</span>
            <span>{charCount} {charCount === 1 ? 'caractere' : 'caracteres'}</span>
          </div>
          
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              isDark
                ? 'hover:bg-white/10 text-white/60 hover:text-white/90'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Expandir editor"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Expandir</span>
          </button>
        </div>
      </div>

      {/* Modal de edição expandida */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay 
            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <DialogPrimitive.Content
            className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50 outline-none"
            style={{
              pointerEvents: 'none',
            }}
          >
            <Resizable
              size={{ width: modalSize.width, height: modalSize.height }}
              onResize={(e, direction, ref, d) => {
                // Atualizar tamanho em tempo real
                setModalSize({
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                });
              }}
              minWidth={Math.floor(window.innerWidth * 0.4)}
              minHeight={Math.floor(window.innerHeight * 0.4)}
              maxWidth={Math.floor(window.innerWidth * 0.95)}
              maxHeight={Math.floor(window.innerHeight * 0.95)}
              enable={{
                top: true,
                right: true,
                bottom: true,
                left: true,
                topRight: true,
                bottomRight: true,
                bottomLeft: true,
                topLeft: true,
              }}
              handleStyles={{
                right: { 
                  width: '8px', 
                  right: '-4px',
                  cursor: 'ew-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                bottom: { 
                  height: '8px', 
                  bottom: '-4px',
                  cursor: 'ns-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                left: { 
                  width: '8px', 
                  left: '-4px',
                  cursor: 'ew-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                top: { 
                  height: '8px', 
                  top: '-4px',
                  cursor: 'ns-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                topRight: { 
                  width: '16px', 
                  height: '16px',
                  right: '-8px',
                  top: '-8px',
                  cursor: 'nesw-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                bottomRight: { 
                  width: '16px', 
                  height: '16px',
                  right: '-8px',
                  bottom: '-8px',
                  cursor: 'nwse-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                bottomLeft: { 
                  width: '16px', 
                  height: '16px',
                  left: '-8px',
                  bottom: '-8px',
                  cursor: 'nesw-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
                topLeft: { 
                  width: '16px', 
                  height: '16px',
                  left: '-8px',
                  top: '-8px',
                  cursor: 'nwse-resize',
                  background: 'transparent',
                  zIndex: 10,
                },
              }}
              style={{
                pointerEvents: 'auto',
              }}
              className={`flex flex-col rounded-lg shadow-lg overflow-hidden ${
                isDark ? 'bg-[#1a1a1a] border-white/10 border' : 'bg-white border-gray-200 border'
              }`}
            >
            {/* Header com botão fechar */}
            <div className={`px-6 pt-6 pb-3 shrink-0 border-b ${
              isDark ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogPrimitive.Title className={`text-lg leading-none font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {label}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className={`text-sm ${
                    isDark ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    Editor redimensionavel &bull; Arraste as bordas para ajustar o tamanho
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close
                  className={`rounded-xs p-1.5 transition-colors ${
                    isDark 
                      ? 'hover:bg-white/10 text-white/60 hover:text-white/90' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>
            
            <div className="flex-1 px-6 pb-3 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                {renderEditor(true)}
              </div>
              
              {/* Contadores no modal */}
              <div className={`flex items-center gap-3 text-sm mt-3 shrink-0 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                <span>{wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}</span>
                <span>&bull;</span>
                <span>{charCount} {charCount === 1 ? 'caractere' : 'caracteres'}</span>
              </div>
            </div>
            
              {/* Indicador visual de resize no canto inferior direito */}
              <div className={`absolute bottom-2 right-2 pointer-events-none ${
                isDark ? 'text-white/20' : 'text-gray-300'
              }`}>
                <GripHorizontal className="w-4 h-4 transform rotate-45" />
              </div>
            </Resizable>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    </>
  );
}
