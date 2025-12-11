import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRagEnabled } from '../hooks/useRagEnabled';
import { toast } from 'sonner@2.0.3';

interface RagEnabledSwitchProps {
  agentId: string | null;
  hasDocuments: boolean;
  isDark?: boolean;
}

export function RagEnabledSwitch({ agentId, hasDocuments, isDark = true }: RagEnabledSwitchProps) {
  const { ragEnabled, isLoading, setRagEnabled } = useRagEnabled(agentId);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!agentId) {
      toast.error('Agente não encontrado');
      return;
    }

    if (!hasDocuments) {
      toast.error('Faça upload de documentos antes de ativar');
      return;
    }

    setIsSaving(true);
    try {
      await setRagEnabled(checked);
      toast.success(
        checked 
          ? '✅ Base de conhecimento ativada!' 
          : '⏸️ Base de conhecimento desativada'
      );
    } catch (err) {
      console.error('[RagEnabledSwitch] Error toggling RAG:', err);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className={`w-4 h-4 rounded ${
          isDark ? 'bg-white/[0.08]' : 'bg-gray-200'
        }`} />
        <div className={`h-4 w-48 rounded ${
          isDark ? 'bg-white/[0.08]' : 'bg-gray-200'
        }`} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={ragEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={isSaving || !hasDocuments || !agentId}
          className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className={`text-sm flex items-center gap-2 ${
          isDark ? 'text-white/70' : 'text-text-primary-light'
        }`}>
          Usar Base de Conhecimento
          {isSaving && (
            <Loader2 className={`w-3 h-3 animate-spin ${
              isDark ? 'text-white/40' : 'text-gray-400'
            }`} />
          )}
        </span>
      </label>

      {/* Aviso se não tem documentos */}
      {!hasDocuments && agentId && (
        <p className={`text-xs ml-6 flex items-center gap-1.5 ${
          isDark ? 'text-yellow-400/80' : 'text-yellow-600'
        }`}>
          <span>⚠️</span>
          <span>Faça upload de documentos para usar a base de conhecimento</span>
        </p>
      )}

      {/* Descrição */}
      {hasDocuments && agentId && (
        <p className={`text-xs ml-6 ${
          isDark ? 'text-white/50' : 'text-gray-500'
        }`}>
          {ragEnabled 
            ? 'O agente consultará os documentos para responder'
            : 'O agente responderá sem consultar documentos'
          }
        </p>
      )}
    </div>
  );
}
