import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

// ✅ Cache global de imagens carregadas para evitar flash de loading ao navegar entre telas
const loadedImagesCache = new Set<string>();

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt, style, className, ...rest } = props
  
  // Inicializa o estado verificando o cache global
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(() => {
    if (!src) return 'error';
    return loadedImagesCache.has(src) ? 'loaded' : 'loading';
  })

  useEffect(() => {
    if (!src) return;
    
    // Se a URL mudou:
    // 1. Se já estiver no cache, marca como loaded imediatamente
    // 2. Se não, marca como loading
    if (loadedImagesCache.has(src)) {
      setStatus('loaded');
    } else {
      setStatus('loading');
    }
  }, [src])

  const handleError = () => {
    setStatus('error')
  }

  const handleLoad = () => {
    if (src) {
      loadedImagesCache.add(src);
    }
    setStatus('loaded')
  }

  // Se não tiver src, nem tenta renderizar imagem
  if (!src) {
    return null;
  }

  if (status === 'error') {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 p-4 rounded-2xl ${className ?? ''}`}
        style={style}
      >
         <AlertCircle className="w-6 h-6 mb-1" />
         <span className="text-[10px]">Erro</span>
      </div>
    )
  }

  return (
    <div className={`relative inline-block overflow-hidden rounded-2xl ${className}`} style={style}>
        {status === 'loading' && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-200/20 dark:bg-gray-700/20 animate-pulse rounded-2xl z-10">
                 {/* Skeleton loader visível apenas se não estiver no cache */}
             </div>
        )}
        <img 
            src={src} 
            alt={alt} 
            className={`block max-w-full h-auto rounded-2xl transition-opacity duration-300 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
            style={style} 
            {...rest} 
            onError={handleError}
            onLoad={handleLoad}
            loading="lazy"
            decoding="async"
        />
    </div>
  )
}
