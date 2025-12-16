import React, { useState, memo } from 'react'
import { AlertCircle } from 'lucide-react'

// ✅ Cache global de imagens já carregadas (evita flash de loading)
const loadedImagesCache = new Set<string>();

// ✅ Extrair URL base sem query params para caching consistente
function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

function ImageWithFallbackInner(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt, style, className, ...rest } = props

  const baseUrl = src ? getBaseUrl(src) : '';

  // ✅ Inicializa como 'loaded' se já está no cache (evita flash)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(() => {
    if (!src) return 'error';
    if (loadedImagesCache.has(baseUrl)) return 'loaded';
    return 'loading';
  })

  const handleError = () => {
    setStatus('error')
  }

  const handleLoad = () => {
    if (src) {
      loadedImagesCache.add(getBaseUrl(src));
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
         <span className="text-[10px]">Erro ao carregar</span>
      </div>
    )
  }

  return (
    <div className={`relative inline-block overflow-hidden rounded-2xl ${className}`} style={style}>
        {status === 'loading' && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-200/20 dark:bg-gray-700/20 animate-pulse rounded-2xl z-10" />
        )}
        <img
            src={src}
            alt={alt}
            className={`block max-w-full h-auto rounded-2xl transition-opacity duration-200 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
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

// ✅ Exportar com memo para evitar re-renders desnecessários
export const ImageWithFallback = memo(ImageWithFallbackInner);
