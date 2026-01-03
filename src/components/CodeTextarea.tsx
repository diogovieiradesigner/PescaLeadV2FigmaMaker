import { useState, useRef, useEffect } from 'react';
import { Maximize2, X, GripHorizontal } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog@1.1.6';
import { Resizable } from 're-resizable';
import DOMPurify from 'dompurify';

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
  rows = 6,
  isDark,
  className = '',
  label = 'Editar',
}: CodeTextareaProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const modalHighlightRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const resizableRef = useRef<any>(null);
  
  // Calcular tamanho inicial do modal
  const getInitialSize = () => ({
    width: Math.floor(window.innerWidth * 0.7),
    height: Math.floor(window.innerHeight * 0.8),
  });
  
  const [modalSize, setModalSize] = useState(getInitialSize);
  
  // Resetar tamanho quando abrir o modal
  useEffect(() => {
    if (isModalOpen) {
      setModalSize(getInitialSize());
    }
  }, [isModalOpen]);

  // Fechar modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resizableRef.current?.resizable) {
        const element = resizableRef.current.resizable;
        if (element && !element.contains(event.target as Node)) {
          setIsModalOpen(false);
        }
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);
  
  // Contadores
  const charCount = value.length;
  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;

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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Colorir tags de abertura e fechamento
    const highlighted = escaped.replace(
      /&lt;(\/?\w+)(?:\s[^&]*?)?&gt;/g,
      (match, tagWithSlash) => {
        const tagName = tagWithSlash.replace('/', '');
        const color = getTagColor(tagName);
        return `<span style="color: ${color}; font-weight: 500;">${match}</span>`;
      }
    );

    // Sanitizar com DOMPurify para prevenir XSS
    return DOMPurify.sanitize(highlighted, {
      ALLOWED_TAGS: ['span'],
      ALLOWED_ATTR: ['style'],
    });
  };

  // Sincronizar scroll do highlight com o textarea
  const handleScroll = (isModal: boolean) => {
    const textarea = isModal ? modalTextareaRef.current : textareaRef.current;
    const highlight = isModal ? modalHighlightRef.current : highlightRef.current;
    
    if (textarea && highlight) {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
  };

  // Renderizar editor (normal ou modal)
  const renderEditor = (isModal: boolean) => {
    const currentTextareaRef = isModal ? modalTextareaRef : textareaRef;
    const currentHighlightRef = isModal ? modalHighlightRef : highlightRef;

    return (
      <div 
        className={`relative w-full rounded-lg border ${
          isDark
            ? 'bg-white/[0.05] border-white/[0.1]'
            : 'bg-white border-gray-200'
        } ${!isModal ? className : ''}`}
        style={isModal ? { height: '100%' } : {}}
      >
        {/* Highlight overlay - atrás do textarea */}
        <div
          ref={currentHighlightRef}
          className={`absolute inset-0 px-4 py-3 font-mono text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words rounded-lg ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
          style={{
            lineHeight: '1.6',
            wordBreak: 'break-word',
            zIndex: 1,
          }}
          dangerouslySetInnerHTML={{ __html: highlightSyntax(value) || '&nbsp;' }}
        />

        {/* Textarea - transparente para mostrar o highlight */}
        <textarea
          ref={currentTextareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={() => handleScroll(isModal)}
          placeholder={placeholder}
          rows={isModal ? undefined : rows}
          spellCheck={false}
          className={`relative w-full px-4 py-3 font-mono text-sm rounded-lg border-none resize-none outline-none transition-all bg-transparent ${
            isDark
              ? 'text-transparent caret-white placeholder:text-white/40 focus:ring-2 focus:ring-[#0169D9]/20'
              : 'text-transparent caret-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0169D9]/20'
          } ${!isModal ? className : ''}`}
          style={{
            lineHeight: '1.6',
            height: isModal ? '100%' : undefined,
            WebkitTextFillColor: 'transparent',
            zIndex: 2,
          }}
        />
      </div>
    );
  };

  return (
    <>
      {/* Editor Principal - Compacto */}
      <div className="relative">
        {renderEditor(false)}
        
        {/* Barra de informações e ações */}
        <div
          className={`flex items-center justify-between mt-2 px-1 text-xs ${
            isDark ? 'text-white/50' : 'text-gray-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
            </span>
            <span>&bull;</span>
            <span>
              {charCount} {charCount === 1 ? 'caractere' : 'caracteres'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              isDark
                ? 'hover:bg-white/10 text-white/60 hover:text-white/90'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            title="Expandir editor"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expandir</span>
          </button>
        </div>
      </div>

      {/* Modal de edição expandida */}
      <DialogPrimitive.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50 outline-none"
            style={{ pointerEvents: 'none' }}
          >
            <Resizable
              ref={resizableRef}
              size={modalSize}
              onResize={(e, direction, ref) => {
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
                right: { width: '8px', right: '-4px', cursor: 'ew-resize' },
                bottom: { height: '8px', bottom: '-4px', cursor: 'ns-resize' },
                left: { width: '8px', left: '-4px', cursor: 'ew-resize' },
                top: { height: '8px', top: '-4px', cursor: 'ns-resize' },
                topRight: { width: '16px', height: '16px', right: '-8px', top: '-8px', cursor: 'nesw-resize' },
                bottomRight: { width: '16px', height: '16px', right: '-8px', bottom: '-8px', cursor: 'nwse-resize' },
                bottomLeft: { width: '16px', height: '16px', left: '-8px', bottom: '-8px', cursor: 'nesw-resize' },
                topLeft: { width: '16px', height: '16px', left: '-8px', top: '-8px', cursor: 'nwse-resize' },
              }}
              style={{
                pointerEvents: 'auto',
              }}
              className={`rounded-lg shadow-2xl border flex flex-col ${
                isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              {/* Header fixo */}
              <div
                className={`px-6 py-4 flex-shrink-0 border-b ${
                  isDark ? 'border-white/10' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogPrimitive.Title
                      className={`text-lg font-semibold mb-1 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {label}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description
                      className={`text-sm ${
                        isDark ? 'text-white/60' : 'text-gray-600'
                      }`}
                    >
                      Arraste as bordas para redimensionar o editor
                    </DialogPrimitive.Description>
                  </div>
                  <DialogPrimitive.Close
                    className={`flex-shrink-0 rounded p-1.5 transition-colors ${
                      isDark
                        ? 'hover:bg-white/10 text-white/60 hover:text-white/90'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </DialogPrimitive.Close>
                </div>
              </div>

              {/* Área do Editor */}
              <div className="flex-1 p-6" style={{ minHeight: 0 }}>
                {renderEditor(true)}
              </div>

              {/* Footer fixo com estatísticas */}
              <div
                className={`px-6 py-3 flex-shrink-0 border-t ${
                  isDark ? 'border-white/10' : 'border-gray-200'
                }`}
              >
                <div
                  className={`flex items-center gap-3 text-sm ${
                    isDark ? 'text-white/50' : 'text-gray-500'
                  }`}
                >
                  <span>
                    {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
                  </span>
                  <span>&bull;</span>
                  <span>
                    {charCount} {charCount === 1 ? 'caractere' : 'caracteres'}
                  </span>
                </div>
              </div>

              {/* Indicador visual de resize */}
              <div
                className={`absolute bottom-2 right-2 pointer-events-none ${
                  isDark ? 'text-white/20' : 'text-gray-300'
                }`}
              >
                <GripHorizontal className="w-4 h-4 transform rotate-45" />
              </div>
            </Resizable>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}