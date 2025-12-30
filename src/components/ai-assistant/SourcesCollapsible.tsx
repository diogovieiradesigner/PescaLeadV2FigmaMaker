import { Theme } from '../../hooks/useTheme';
import { SearchSource } from '../../types/ai-assistant';
import { ExternalLink } from 'lucide-react';

interface SourcesCollapsibleProps {
  sources: SearchSource[];
  theme: Theme;
}

export function SourcesCollapsible({ sources, theme }: SourcesCollapsibleProps) {
  const isDark = theme === 'dark';

  if (!sources || sources.length === 0) return null;

  // Extrair domínio de uma URL
  const getDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      // Encurtar domínios longos
      const parts = domain.split('.');
      if (parts.length > 2) {
        return parts.slice(-2).join('.');
      }
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <div className={`mt-3 pt-2 border-t ${
      isDark ? 'border-white/[0.06]' : 'border-gray-200/60'
    }`}>
      {/* Tags container - minimalista */}
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, index) => {
          const domain = getDomain(source.url);

          return (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px]
                transition-all duration-150 group
                ${isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                }
              `}
              title={source.title || domain}
            >
              {/* Number */}
              <span className="font-medium">{index + 1}</span>

              {/* Domain */}
              <span className="truncate max-w-[100px]">{domain}</span>

              {/* External link icon */}
              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
