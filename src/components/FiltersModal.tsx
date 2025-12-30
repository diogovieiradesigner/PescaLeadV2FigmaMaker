import { X } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  filters: {
    // Campos da tabela lead_extractions
    niche?: string;
    prompt?: string;
    require_website?: boolean;
    require_phone?: boolean;
    require_email?: boolean;
    min_reviews?: number;
    min_rating?: number;
    expand_state_search?: boolean;
    filters_json?: any;
    // Campos da tabela lead_extraction_runs
    filters_applied?: any;
    // Campos de busca
    search_term?: string;
    location?: string;
  };
}

export function FiltersModal({ isOpen, onClose, theme, filters }: FiltersModalProps) {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const formatFilterValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return 'Não definido';
    }
    return JSON.stringify(value);
  };

  const formatJsonFilter = (jsonData: any): string => {
    if (!jsonData) return 'Nenhum filtro adicional';
    
    try {
      if (typeof jsonData === 'string') {
        const parsed = JSON.parse(jsonData);
        return JSON.stringify(parsed, null, 2);
      }
      return JSON.stringify(jsonData, null, 2);
    } catch {
      return 'Dados inválidos';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`max-w-2xl w-full mx-4 rounded-lg shadow-xl max-h-[80vh] overflow-hidden ${
        isDark ? 'bg-[#1a1a1a] border border-white/[0.08]' : 'bg-white border border-border-light'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <h3 className={`font-medium text-lg ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            Detalhes dos Filtros
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-white/[0.05] text-white/60 hover:text-white' 
                : 'hover:bg-gray-100 text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto scrollbar-thin max-h-[60vh]">
          <div className="space-y-6">
            {/* Parâmetros de Busca */}
            <div>
              <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                🔍 Parâmetros de Busca
              </h4>
              <div className={`p-4 rounded-lg space-y-3 ${
                isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-border-light'
              }`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    Termo de Busca:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {filters.search_term || 'Não definido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    Localização:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {filters.location || 'Não definida'}
                  </span>
                </div>
                {filters.niche && (
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                      Nicho:
                    </span>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {filters.niche}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Requisitos de Contato */}
            <div>
              <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                📞 Requisitos de Contato
              </h4>
              <div className={`p-4 rounded-lg space-y-3 ${
                isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-border-light'
              }`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    🌐 Website:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {formatFilterValue(filters.require_website)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    📞 Telefone:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {formatFilterValue(filters.require_phone)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    ✉️ Email:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {formatFilterValue(filters.require_email)}
                  </span>
                </div>
              </div>
            </div>

            {/* Critérios de Qualidade */}
            <div>
              <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                ⭐ Critérios de Qualidade
              </h4>
              <div className={`p-4 rounded-lg space-y-3 ${
                isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-border-light'
              }`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    Mínimo de Avaliações:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {filters.min_reviews || 0}+ reviews
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    Avaliação Mínima:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {filters.min_rating || 0} estrelas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/70' : 'text-text-secondary-light'}>
                    Expandir para Estado:
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {formatFilterValue(filters.expand_state_search)}
                  </span>
                </div>
              </div>
            </div>

            {/* Prompt Personalizado */}
            {filters.prompt && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  ✏️ Prompt Personalizado
                </h4>
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-border-light'
                }`}>
                  <p className={`text-sm whitespace-pre-wrap ${
                    isDark ? 'text-white/80' : 'text-text-primary-light'
                  }`}>
                    {filters.prompt}
                  </p>
                </div>
              </div>
            )}

            {/* Filtros Adicionais em JSON */}
            {(filters.filters_json || filters.filters_applied) && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  🔧 Filtros Adicionais
                </h4>
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-border-light'
                }`}>
                  <pre className={`text-xs whitespace-pre-wrap overflow-x-auto scrollbar-thin ${
                    isDark ? 'text-white/80' : 'text-text-primary-light'
                  }`}>
                    {formatJsonFilter(filters.filters_applied || filters.filters_json)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}