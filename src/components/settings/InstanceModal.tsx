import { useState, useEffect } from 'react';
import { X, Check, Copy } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Instance, Inbox } from '../SettingsView';
import { SUPABASE_URL } from '../../utils/api-config';
import { toast } from 'sonner';

interface InstanceModalProps {
  theme: Theme;
  instance: Instance | null;
  inboxes: Inbox[];
  onClose: () => void;
  onSave: (instance: Instance) => Promise<any>;
}

export function InstanceModal({ theme, instance, inboxes, onClose, onSave }: InstanceModalProps) {
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState<Omit<Instance, 'id'>>({
    name: '',
    provider: 'evolution',
    phone_number: '',
    inbox: '',
    status: 'disconnected',
  });

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // ✅ Função robusta para copiar texto (fallback para browsers que bloqueiam clipboard API)
  const copyToClipboard = async (text: string) => {
    try {
      // Método moderno (Clipboard API)
      await navigator.clipboard.writeText(text);
      setCopiedWebhook(true);
      toast.success('Webhook copiado para área de transferência');
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch (err) {
      // Fallback: Cria um textarea temporário e usa execCommand
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedWebhook(true);
          toast.success('Webhook copiado para área de transferência');
          setTimeout(() => setCopiedWebhook(false), 2000);
        } else {
          console.error('execCommand copy falhou');
          toast.error('Erro ao copiar webhook');
        }
      } catch (e) {
        console.error('Falha ao copiar:', e);
        toast.error('Erro ao copiar webhook');
      }
      
      document.body.removeChild(textArea);
    }
  };

  useEffect(() => {
    if (instance) {
      setFormData({
        name: instance.name || '',
        provider: instance.provider || 'evolution',
        phone_number: instance.phone_number || '',
        inbox: instance.inbox || '',
        status: instance.status || 'disconnected',
      });
    }
  }, [instance]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validação em tempo real
  const isValid = Boolean(
    formData.name?.trim() &&
    formData.phone_number?.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) return;

    setError(null);
    setLoading(true);
    
    try {
      const result = await onSave({
        ...formData,
        id: instance?.id || '',
      });

      // ✅ Notificação de sucesso
      if (instance?.id) {
        toast.success('Instância atualizada com sucesso');
      } else {
        toast.success('Instância criada com sucesso');
      }

      // Check for QR Code in result
      let qrCodeData = result?.qrcode || result?.z_api_data?.qr_code;
      
      // Handle if qrCodeData is an object (common in some API responses)
      if (typeof qrCodeData === 'object' && qrCodeData !== null) {
        qrCodeData = qrCodeData.base64 || qrCodeData.qrcode || qrCodeData.pairingCode;
      }

      if (qrCodeData && typeof qrCodeData === 'string') {
        setQrCode(qrCodeData);
        toast.info('QR Code gerado. Escaneie com WhatsApp', { duration: 4000 });
      }
    } catch (err) {
      console.error('[InstanceModal] Error saving:', err);
      // Extrair mensagem de erro legível
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar instância';
      
      // Tratamento específico para erro de nome duplicado na Evolution
      if (errorMessage.includes('already in use')) {
        const errorMsg = 'Este nome já está em uso. Por favor, escolha outro nome.';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setError(errorMessage);
        toast.error('Erro ao salvar instância: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Slugify helper
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')            // Separate accents from letters
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .trim()
      .replace(/[\s_]+/g, '-')     // Replace spaces and underscores with -
      .replace(/[^\w-]+/g, '')     // Remove all non-word chars
      .replace(/--+/g, '-');       // Replace multiple - with single -
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Apenas aplica o slug se for provider Evolution, ou sempre? O usuário pediu "forçar no nome".
    // Vou aplicar sempre que digitar, para garantir consistência
    const slug = slugify(val);
    setFormData({ ...formData, name: slug });
  };

  const handleClose = () => {
    // Se estiver mostrando QR Code, o fechamento deve recarregar ou limpar
    if (qrCode) {
      onClose();
    } else {
      onClose();
    }
  };

  // QR Code View
  if (qrCode) {
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
              onClick={handleClose}
              className={`p-1 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/[0.05] text-white/50' : 'hover:bg-light-elevated-hover text-text-secondary-light'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 flex flex-col items-center justify-center space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <img 
                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                alt="QR Code WhatsApp" 
                className="w-64 h-64 object-contain"
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                Abra o WhatsApp no seu celular, vá em Aparelhos conectados {'>'} Conectar um aparelho e aponte a câmera.
              </p>
            </div>

            <button
              onClick={handleClose}
              className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                 isDark 
                   ? 'bg-[#0169D9] hover:bg-[#0158b8] text-white' 
                   : 'bg-[#0169D9] hover:bg-[#0158b8] text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              Concluído
            </button>
          </div>
        </div>
      </div>
    );
  }

  const webhookUrl = `${SUPABASE_URL}/functions/v1/make-server-e4f9d774/webhook/uazapi`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden ${
          isDark ? 'bg-elevated' : 'bg-light-elevated'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'bg-[#0A0A0A] border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
            {instance ? 'Editar Instância' : 'Nova Instância'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className={`px-6 py-6 space-y-4 ${isDark ? 'bg-[#0A0A0A]' : ''}`}>
          
          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-sm ${
              isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Nome da Instância
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-true-black border-white/[0.08] text-white placeholder-white/40'
                  : 'bg-light-bg border-border-light text-text-primary-light placeholder-text-secondary-light'
              }`}
              placeholder="ex: whatsapp-principal"
              required
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-text-secondary-light/70'}`}>
              Apenas letras minúsculas, números e hífens.
            </p>
          </div>

          {/* Provider */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Canal / Provider
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
              style={isDark ? { colorScheme: 'dark' } : undefined}
              className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-true-black border-white/[0.08] text-white'
                  : 'bg-light-bg border-border-light text-text-primary-light'
              }`}
              required
            >
              <option value="evolution" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Evolution API</option>
              <option value="uazapi" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Uazapi</option>
            </select>
          </div>

          {/* Telefone */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Número de Telefone
            </label>
            <input
              type="text"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-true-black border-white/[0.08] text-white placeholder-white/40'
                  : 'bg-light-bg border-border-light text-text-primary-light placeholder-text-secondary-light'
              }`}
              placeholder="+55 11 98765-4321"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white'
                  : 'bg-light-elevated-hover hover:bg-gray-200 text-text-primary-light'
              }`}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-2 rounded-lg transition-colors font-medium ${
                isValid 
                  ? 'bg-[#0169D9] hover:bg-[#0158b8] text-white' 
                  : isDark 
                    ? 'bg-white/[0.1] text-white/30 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading || !isValid}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}