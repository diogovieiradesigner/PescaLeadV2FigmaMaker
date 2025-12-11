import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number; // Altura estimada de cada item
  containerHeight: number; // Altura do container visível
  overscan?: number; // Número de itens extras a renderizar fora da viewport
}

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number[];
  totalHeight: number;
  offsetY: number;
}

/**
 * Hook para virtual scrolling
 * Renderiza apenas os itens visíveis na viewport
 */
export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular índices visíveis
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Array de índices visíveis
  const visibleItems = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, i) => startIndex + i
  );

  // Altura total do conteúdo virtual
  const totalHeight = items.length * itemHeight;

  // Offset Y para posicionar os itens
  const offsetY = startIndex * itemHeight;

  // Handler de scroll
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    if (target) {
      setScrollTop(target.scrollTop);
    }
  }, []);

  // Adicionar listener de scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    offsetY,
  };
}

