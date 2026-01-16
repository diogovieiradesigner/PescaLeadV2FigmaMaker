import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Theme } from '../../hooks/useTheme';
import { Loader2, Trash2, Archive } from 'lucide-react';

interface ContextUsageIndicatorProps {
  usagePercent: number; // 0-100
  usedTokens: number;
  maxTokens: number;
  theme: Theme;
  onForceCompact?: () => Promise<void>;
  isCompacting?: boolean;
}

export function ContextUsageIndicator({
  usagePercent,
  usedTokens,
  maxTokens,
  theme,
  onForceCompact,
  isCompacting = false,
}: ContextUsageIndicatorProps) {
  const isDark = theme === 'dark';
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determinar cor baseada no uso
  const getColor = () => {
    if (usagePercent >= 85) return '#ef4444'; // Vermelho - crítico
    if (usagePercent >= 70) return '#f59e0b'; // Amarelo - atenção
    if (usagePercent >= 50) return '#0169D9'; // Azul - normal
    return '#22c55e'; // Verde - baixo uso
  };

  const color = getColor();
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usagePercent / 100) * circumference;

  // Formatar números grandes
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  // Calcular posição do dropdown quando mostrar
  useEffect(() => {
    if (showDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 8, // 8px acima do elemento
        left: rect.left + rect.width / 2,
      });
    }
  }, [showDropdown]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleCompact = async () => {
    if (onForceCompact && !isCompacting) {
      await onForceCompact();
      setShowDropdown(false);
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative flex items-center"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {/* Mini gráfico circular */}
        <div className="relative w-7 h-7 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
          {isCompacting ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color }} />
          ) : (
            <>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                {/* Background circle */}
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth="3"
                />
                {/* Progress circle */}
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              </svg>
              {/* Percentage text in center */}
              <span
                className="absolute text-[8px] font-bold"
                style={{ color }}
              >
                {Math.round(usagePercent)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Dropdown - Renderizado via Portal para ficar acima de tudo */}
      {showDropdown && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed px-3 py-2 rounded-lg shadow-xl text-xs ${
            isDark
              ? 'bg-zinc-800 text-white border border-white/10'
              : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
          }`}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
            minWidth: '180px',
          }}
        >
          <div className="font-semibold mb-2">Uso do Contexto</div>

          {/* Barra de progresso visual */}
          <div className={`w-full h-2 rounded-full mb-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(usagePercent, 100)}%`, backgroundColor: color }}
            />
          </div>

          <div className={`${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            <span style={{ color }}>{usagePercent}%</span> utilizado
          </div>
          <div className={`${isDark ? 'text-white/50' : 'text-gray-500'} mb-3`}>
            {formatTokens(usedTokens)} / {formatTokens(maxTokens)} tokens
          </div>

          {usagePercent >= 85 && (
            <div className="mb-3 text-red-400 text-[10px]">
              ⚠️ Contexto será resumido automaticamente em breve
            </div>
          )}

          {/* Separador */}
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'} my-2`} />

          {/* Botão de compactação forçada */}
          {onForceCompact && (
            <button
              onClick={handleCompact}
              disabled={isCompacting || usedTokens === 0}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                isCompacting || usedTokens === 0
                  ? isDark
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-gray-300 cursor-not-allowed'
                  : isDark
                  ? 'text-white/80 hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isCompacting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>{isCompacting ? 'Compactando...' : 'Compactar agora'}</span>
            </button>
          )}

          <div className={`mt-2 text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Compactar resume a conversa e libera espaço no contexto
          </div>

          {/* Arrow */}
          <div
            className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent ${
              isDark ? 'border-t-zinc-800' : 'border-t-white'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
}
