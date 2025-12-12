import { AlertTriangle, Trash2, X } from 'lucide-react';
import { cn } from './utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isDark?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isDark = true,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      iconColor: isDark ? 'text-red-400' : 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100',
      iconColor: isDark ? 'text-yellow-400' : 'text-yellow-600',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    default: {
      icon: AlertTriangle,
      iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      iconColor: isDark ? 'text-blue-400' : 'text-blue-600',
      buttonBg: 'bg-[#0169D9] hover:bg-[#0158b8]',
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl shadow-xl overflow-hidden',
          isDark ? 'bg-[#1A1A1A]' : 'bg-white'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', styles.iconBg)}>
              <Icon className={cn('w-5 h-5', styles.iconColor)} />
            </div>
            <h2 className={cn(
              'text-lg font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-white/10 text-white/50 hover:text-white'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className={cn(
            'text-sm',
            isDark ? 'text-white/70' : 'text-gray-600'
          )}>
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-end gap-3 px-6 py-4 border-t',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            )}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors',
              styles.buttonBg,
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
