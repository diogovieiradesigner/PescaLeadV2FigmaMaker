import { X, Check, Loader2 } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { useEffect, useState } from 'react';

interface QrCodeModalProps {
  theme: Theme;
  qrCode: string;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
  onComplete?: () => void; // ✅ NOVO: Callback ao clicar em "Concluído"
}

export function QrCodeModal({ theme, qrCode, onClose, onRefresh, onComplete }: QrCodeModalProps) {
  const isDark = theme === 'dark';
  const [timeLeft, setTimeLeft] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!onRefresh) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Trigger refresh
          setIsRefreshing(true);
          onRefresh().finally(() => {
            setIsRefreshing(false);
            setTimeLeft(30);
          });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRefresh]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-lg shadow-xl overflow-hidden ${
          isDark ? 'bg-elevated' : 'bg-light-elevated'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
            Escaneie o QR Code
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/[0.05] text-white/50' : 'hover:bg-light-elevated-hover text-text-secondary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm relative">
            <img 
              src={`data:image/png;base64,${qrCode.replace('data:image/png;base64,', '')}`}
              alt="QR Code WhatsApp" 
              className={`w-64 h-64 object-contain transition-opacity ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}
            />
            {isRefreshing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#0169D9] animate-spin" />
              </div>
            )}
          </div>
          
          <div className="text-center space-y-2">
            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Abra o WhatsApp no seu celular, vá em Aparelhos conectados {'>'} Conectar um aparelho e aponte a câmera.
            </p>
            {onRefresh && (
              <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-text-secondary-light/70'}`}>
                Atualizando em {timeLeft}s...
              </p>
            )}
          </div>

          <button
            onClick={onComplete ? onComplete : onClose} // ✅ NOVO: Chama onComplete se estiver definido, senão chama onClose
            className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
               isDark 
                 ? 'bg-[#0169D9] hover:bg-[#0158b8] text-white' 
                 : 'bg-[#0169D9] hover:bg-[#0158b8] text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            Concluído
          </button>

          {/* ✅ NOVO: Botão Cancelar */}
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg font-medium transition-all ${
               isDark 
                 ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70' 
                 : 'bg-gray-100 hover:bg-gray-200 text-text-secondary-light'
            }`}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}