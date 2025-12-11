import { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';

interface DeleteFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  theme: Theme;
  funnelId: string;
  funnelName: string;
}

interface DeleteCheckResult {
  can_delete: boolean;
  reason?: string;
  warning?: string;
  leads_count?: number;
}

export function DeleteFunnelModal({
  isOpen,
  onClose,
  onConfirm,
  theme,
  funnelId,
  funnelName,
}: DeleteFunnelModalProps) {
  const isDark = theme === 'dark';
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkResult, setCheckResult] = useState<DeleteCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isOpen && funnelId) {
      checkCanDelete();
    } else {
      // Reset state when modal closes
      setCheckResult(null);
      setIsChecking(true);
    }
  }, [isOpen, funnelId]);

  const checkCanDelete = async () => {
    try {
      setIsChecking(true);
      console.log('[DELETE FUNNEL MODAL] Verificando se pode deletar funil:', funnelId);

      const { data, error } = await supabase.rpc('can_delete_funnel', {
        p_funnel_id: funnelId,
      });

      if (error) {
        console.error('[DELETE FUNNEL MODAL] Erro ao verificar:', error);
        setCheckResult({
          can_delete: false,
          reason: 'Erro ao verificar permissões de deleção',
        });
        return;
      }

      console.log('[DELETE FUNNEL MODAL] Resultado da verificação:', data);
      setCheckResult(data as DeleteCheckResult);
    } catch (error) {
      console.error('[DELETE FUNNEL MODAL] Erro na verificação:', error);
      setCheckResult({
        can_delete: false,
        reason: 'Erro ao verificar permissões de deleção',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!checkResult?.can_delete) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('[DELETE FUNNEL MODAL] Erro ao deletar:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0A0A0A]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2
              className={`text-lg font-medium ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}
            >
              Deletar Funil
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/70 hover:text-white'
                : 'hover:bg-black/[0.05] text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {isChecking ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#0169D9] animate-spin mb-3" />
              <p
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Verificando permissões...
              </p>
            </div>
          ) : checkResult?.can_delete ? (
            <div className="space-y-4">
              <p
                className={`text-sm ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}
              >
                Você está prestes a deletar o funil{' '}
                <strong className={isDark ? 'text-white' : 'text-text-primary-light'}>
                  "{funnelName}"
                </strong>
                .
              </p>

              {checkResult.warning && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500 mb-1 font-medium">
                        Atenção
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        {checkResult.warning}
                      </p>
                      {checkResult.leads_count && checkResult.leads_count > 0 && (
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                          <strong>{checkResult.leads_count}</strong> lead(s) serão migrados
                          automaticamente para outro funil.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <p
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Esta ação não pode ser desfeita.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-500 mb-1">
                      Não é possível deletar este funil
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {checkResult?.reason || 'Erro desconhecido'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors text-sm ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/70'
                : 'hover:bg-black/[0.05] text-text-secondary-light'
            }`}
          >
            Cancelar
          </button>
          {checkResult?.can_delete && (
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Deletar Funil
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
