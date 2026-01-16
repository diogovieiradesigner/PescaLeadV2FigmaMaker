import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Theme } from '../../hooks/useTheme';
import { SearchSource } from '../../types/ai-assistant';
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  theme: Theme;
  sources?: SearchSource[];
}

// Componente para tag de citação inline (estilo Perplexity)
function CitationTag({
  number,
  url,
  title,
  isDark,
}: {
  number: number;
  url: string;
  title?: string;
  isDark: boolean;
}) {
  // Extrair domínio curto
  const getDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      const parts = domain.split('.');
      if (parts.length > 2) {
        return parts.slice(-2).join('.');
      }
      return domain;
    } catch {
      return '';
    }
  };

  const domain = getDomain(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded text-[10px] font-medium
        transition-all duration-150 no-underline hover:no-underline
        ${isDark
          ? 'bg-white/[0.08] hover:bg-white/[0.15] text-white/60 hover:text-white/90'
          : 'bg-gray-200/80 hover:bg-gray-300 text-gray-600 hover:text-gray-800'
        }
      `}
      title={title || domain}
    >
      <span>{number}</span>
      {domain && <span className="hidden sm:inline truncate max-w-[60px]">{domain}</span>}
    </a>
  );
}

// Função para processar texto e substituir [n] por tags clicáveis
function processTextWithCitations(
  text: string,
  sources: SearchSource[],
  isDark: boolean
): React.ReactNode[] {
  if (!sources || sources.length === 0) {
    return [text];
  }

  // Regex para encontrar [1], [2], [1,2], [1][2], etc
  const citationRegex = /\[(\d+(?:,\s*\d+)*)\]|\[(\d+)\]\[(\d+)\]/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Adicionar texto antes da citação
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Extrair números da citação
    const numbersStr = match[1] || `${match[2]},${match[3]}`;
    const numbers = numbersStr.split(/,\s*/).map(n => parseInt(n.trim(), 10));

    // Criar tags para cada número
    numbers.forEach((num, idx) => {
      const sourceIndex = num - 1; // [1] = sources[0]
      const source = sources[sourceIndex];

      if (source) {
        parts.push(
          <CitationTag
            key={`citation-${match!.index}-${num}`}
            number={num}
            url={source.url}
            title={source.title}
            isDark={isDark}
          />
        );
      } else {
        // Fonte não encontrada, mostrar número simples
        parts.push(
          <span
            key={`citation-${match!.index}-${num}`}
            className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}
          >
            [{num}]
          </span>
        );
      }
    });

    lastIndex = match.index + match[0].length;
  }

  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Componente wrapper para processar children com citações
function WithCitations({
  children,
  sources,
  isDark,
}: {
  children: React.ReactNode;
  sources?: SearchSource[];
  isDark: boolean;
}) {
  if (!sources || sources.length === 0) {
    return <>{children}</>;
  }

  const processChildren = (child: React.ReactNode): React.ReactNode => {
    if (typeof child === 'string') {
      const processed = processTextWithCitations(child, sources, isDark);
      return <>{processed}</>;
    }

    if (React.isValidElement(child) && child.props.children) {
      return React.cloneElement(child, {
        ...child.props,
        children: React.Children.map(child.props.children, processChildren),
      });
    }

    return child;
  };

  return <>{React.Children.map(children, processChildren)}</>;
}

export function MarkdownRenderer({ content, theme, sources }: MarkdownRendererProps) {
  const isDark = theme === 'dark';

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className={`text-xl font-bold mb-3 mt-4 first:mt-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className={`text-lg font-bold mb-2 mt-3 first:mt-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className={`text-base font-semibold mb-2 mt-3 first:mt-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </h3>
        ),

        // Paragraph - com processamento de citações
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </p>
        ),

        // Bold and Italic
        strong: ({ children }) => (
          <strong className="font-semibold">
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic">
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </em>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:no-underline ${
              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {children}
          </a>
        ),

        // Lists - com processamento de citações
        ul: ({ children }) => (
          <ul className={`list-disc list-inside mb-2 space-y-1 ${isDark ? 'marker:text-white/50' : 'marker:text-gray-500'}`}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className={`list-decimal list-inside mb-2 space-y-1 ${isDark ? 'marker:text-white/50' : 'marker:text-gray-500'}`}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </li>
        ),

        // Code blocks
        code: ({ className, children, ...props }) => {
          const isInline = !className;

          if (isInline) {
            return (
              <code
                className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                  isDark
                    ? 'bg-white/10 text-pink-300'
                    : 'bg-gray-100 text-pink-600'
                }`}
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <code
              className={`block p-3 rounded-lg text-sm font-mono overflow-x-auto scrollbar-thin my-2 ${
                isDark
                  ? 'bg-black/30 text-green-300'
                  : 'bg-gray-800 text-green-400'
              }`}
              {...props}
            >
              {children}
            </code>
          );
        },

        // Pre (code block wrapper)
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto scrollbar-thin">{children}</pre>
        ),

        // Blockquote - com processamento de citações
        blockquote: ({ children }) => (
          <blockquote
            className={`border-l-4 pl-4 my-2 italic ${
              isDark
                ? 'border-white/20 text-white/70'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </blockquote>
        ),

        // Horizontal rule
        hr: () => (
          <hr className={`my-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
        ),

        // Tables (GFM)
        table: ({ children }) => (
          <div className="overflow-x-auto scrollbar-thin my-2">
            <table className={`min-w-full text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className={isDark ? 'bg-white/5' : 'bg-gray-50'}>{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className={`px-3 py-2 text-left font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </th>
        ),
        td: ({ children }) => (
          <td className={`px-3 py-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            <WithCitations sources={sources} isDark={isDark}>{children}</WithCitations>
          </td>
        ),

        // Task lists (GFM)
        input: ({ type, checked }) => {
          if (type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className={`mr-2 rounded ${
                  isDark ? 'accent-blue-500' : 'accent-blue-600'
                }`}
              />
            );
          }
          return null;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
