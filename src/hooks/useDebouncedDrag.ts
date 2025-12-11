import { useRef, useCallback } from 'react';

/**
 * Hook para debounce de operações de drag
 * Reduz chamadas excessivas durante o arrasto
 */
export function useDebouncedDrag<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 16 // ~60fps
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      // Throttle: Se última chamada foi muito recente, agendar para depois
      if (now - lastCallRef.current < delay) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay);
      } else {
        // Executar imediatamente se passou tempo suficiente
        lastCallRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook para throttle (limita frequência de execução)
 * Útil para scroll events, resize, etc
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  limit: number = 100
): T {
  const inThrottle = useRef<boolean>(false);
  const lastCallArgs = useRef<Parameters<T> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        
        setTimeout(() => {
          inThrottle.current = false;
          
          // Se houve chamada durante throttle, executar a última
          if (lastCallArgs.current) {
            callback(...lastCallArgs.current);
            lastCallArgs.current = null;
          }
        }, limit);
      } else {
        // Guardar argumentos da última chamada
        lastCallArgs.current = args;
      }
    }) as T,
    [callback, limit]
  );
}

/**
 * Hook para debounce puro (espera inatividade antes de executar)
 * Útil para search, autocomplete, etc
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}
