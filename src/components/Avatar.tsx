import { memo } from 'react';

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

const bgColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-teal-500',
];

function getInitials(name: string): string {
  // Se não tiver nome, retorna "?"
  if (!name || typeof name !== 'string') {
    return '?';
  }

  // Remove espaços extras e divide em palavras
  const words = name.trim().split(/\s+/).filter(word => word.length > 0);

  // Se não tiver palavras válidas
  if (words.length === 0) {
    return '?';
  }

  // Se tiver uma palavra, pega primeira letra
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }

  // Se tiver múltiplas palavras, pega primeira letra da primeira e última palavra
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getColorFromName(name: string): string {
  if (!name) return bgColors[0];
  
  // Soma os códigos dos caracteres para gerar um índice
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  
  return bgColors[sum % bgColors.length];
}

function AvatarComponent({ name, imageUrl, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  // Se tiver imagem válida (e não for dicebear)
  if (imageUrl && imageUrl.trim() && !imageUrl.includes('dicebear.com')) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Se a imagem falhar ao carregar, esconde ela
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Padrão: mostrar iniciais com cor de fundo
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${bgColor} text-white font-medium flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}

// Memoize para evitar re-renders desnecessários
export const Avatar = memo(AvatarComponent);
