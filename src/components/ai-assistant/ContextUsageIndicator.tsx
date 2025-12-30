import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Theme } from '../../hooks/useTheme';

interface ContextUsageIndicatorProps {
  usagePercent: number; // 0-100
  usedTokens: number;
  maxTokens: number;
  theme: Theme;
}

export function ContextUsageIndicator({
  usagePercent,
  usedTokens,
  maxTokens,
  theme,
}: ContextUsageIndicatorProps) {
  const isDark = theme === 'dark';
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

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

  // Calcular posição do tooltip quando mostrar
  useEffect(() => {
    if (showTooltip && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8, // 8px acima do elemento
        left: rect.left + rect.width / 2,
      });
    }
  }, [showTooltip]);

  return (
    <>
      <div
        ref={triggerRef}
        className="relative flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Mini gráfico circular */}
        <div className="relative w-7 h-7 flex items-center justify-center cursor-help">
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
        </div>
      </div>

      {/* Tooltip - Renderizado via Portal para ficar acima de tudo */}
      {showTooltip && createPortal(
        <div
          className={`fixed px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap pointer-events-none ${
            isDark
              ? 'bg-zinc-800 text-white border border-white/10'
              : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
          }`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
          }}
        >
          <div className="font-semibold mb-1">Uso do Contexto</div>
          <div className={`${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            <span style={{ color }}>{usagePercent}%</span> utilizado
          </div>
          <div className={`${isDark ? 'text-white/50' : 'text-gray-500'} mt-1`}>
            {formatTokens(usedTokens)} / {formatTokens(maxTokens)} tokens
          </div>
          {usagePercent >= 85 && (
            <div className="mt-1 text-red-400 text-[10px]">
              Contexto será resumido em breve
            </div>
          )}
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
