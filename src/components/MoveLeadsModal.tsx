import { useState, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, 
  ArrowRight,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface MoveLeadsModalProps {
  theme: Theme;
  runId: string;
  runName: string;
  leadCount: number;
  currentFunnelId: string;
  currentFunnelName: string;
  currentColumnId: string;
  currentColumnName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Funnel {
  id: string;
  name: string;
  columns: Column[];
}

interface Column {
  id: string;
  title: string;
  position: number;
}

export function MoveLeadsModal({
  theme,
  runId,
  runName,
  leadCount,
  currentFunnelId,
  currentFunnelName,
  currentColumnId,
  currentColumnName,
  open,
  onOpenChange,
  onSuccess,
}: MoveLeadsModalProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState(currentFunnelId);
  const [selectedColumnId, setSelectedColumnId] = useState(currentColumnId);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Carregar funnels e colunas
  useEffect(() => {
    if (open && currentWorkspace?.id) {
      loadFunnels();
    }
  }, [open, currentWorkspace?.id]);

  // Reset ao abrir modal
  useEffect(() => {
    if (open) {
      setSelectedFunnelId(currentFunnelId);
      setSelectedColumnId(currentColumnId);
      setProcessing(false);
      setSuccess(false);
    }
  }, [open, currentFunnelId, currentColumnId]);

  const loadFunnels = async () => {
    if (!currentWorkspace?.id) return;

    setLoadingFunnels(true);
    try {
      // Buscar funnels
      const { data: funnelsData, error: funnelsError } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (funnelsError) throw funnelsError;

      // Buscar colunas de todos os funnels
      const { data: columnsData, error: columnsError } = await supabase
        .from('funnel_columns')
        .select('id, title, position, funnel_id')
        .in('funnel_id', funnelsData?.map(f => f.id) || [])
        .order('position');

      if (columnsError) throw columnsError;

      // Organizar dados
      const funnelsWithColumns = funnelsData?.map(funnel => ({
        ...funnel,
        columns: columnsData?.filter(col => col.funnel_id === funnel.id) || [],
      })) || [];

      setFunnels(funnelsWithColumns);
    } catch (error) {
      console.error('Erro ao carregar funnels:', error);
      toast.error('Erro ao carregar kanbans');
    } finally {
      setLoadingFunnels(false);
    }
  };

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    // Reset coluna quando mudar kanban
    const selectedFunnel = funnels.find(f => f.id === funnelId);
    if (selectedFunnel && selectedFunnel.columns.length > 0) {
      setSelectedColumnId(selectedFunnel.columns[0].id);
    }
  };

  const handleConfirm = async () => {
    if (!selectedFunnelId || !selectedColumnId) {
      toast.error('Selecione um kanban e uma coluna');
      return;
    }

    // Validar se não é a mesma coluna
    if (selectedFunnelId === currentFunnelId && selectedColumnId === currentColumnId) {
      toast.error('Os leads já estão nesta coluna');
      return;
    }

    setProcessing(true);

    try {
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Chamar função RPC do Supabase
      const { data, error } = await supabase.rpc('queue_lead_migration', {
        p_run_id: runId,
        p_funnel_id: selectedFunnelId,
        p_column_id: selectedColumnId,
        p_batch_size: 100
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido ao processar movimentação');
      }

      setSuccess(true);
      toast.success(`✅ ${leadCount} leads movidos com sucesso!`);

      // Fechar modal após 2 segundos
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao mover leads:', error);
      toast.error(error.message || 'Erro ao mover leads');
      setProcessing(false);
    }
  };

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  const selectedColumn = selectedFunnel?.columns.find(c => c.id === selectedColumnId);
  const isCurrentLocation = selectedFunnelId === currentFunnelId && selectedColumnId === currentColumnId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[500px] p-0 gap-0",
        isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <DialogHeader className={cn(
          "p-6 pb-4 border-b",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}>
          <DialogTitle className={cn(
            "flex items-center gap-2 text-lg",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            <ArrowRight className="w-5 h-5" />
            Alterar Coluna dos Leads Extraídos
          </DialogTitle>
          <DialogDescription className={cn(
            "text-sm mt-2",
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            Mova os leads desta extração para outra coluna ou kanban
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Informações da Execução */}
          <div className={cn(
            "p-4 rounded-lg border",
            isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
          )}>
            <h4 className={cn(
              "text-xs font-medium uppercase tracking-wide mb-3",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              📊 Informações da Execução
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Extração:</span>
                <p className={cn("font-medium mt-0.5", isDark ? "text-white" : "text-zinc-900")}>
                  {runName}
                </p>
              </div>
              <div>
                <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Total de leads:</span>
                <p className={cn("font-medium mt-0.5", isDark ? "text-white" : "text-zinc-900")}>
                  {leadCount}
                </p>
              </div>
              <div>
                <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Kanban atual:</span>
                <p className={cn("font-medium mt-0.5", isDark ? "text-white" : "text-zinc-900")}>
                  {currentFunnelName}
                </p>
              </div>
              <div>
                <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Coluna atual:</span>
                <p className={cn("font-medium mt-0.5", isDark ? "text-white" : "text-zinc-900")}>
                  {currentColumnName}
                </p>
              </div>
            </div>
          </div>

          {/* Nova Configuração */}
          <div className="space-y-4">
            <h4 className={cn(
              "text-xs font-medium uppercase tracking-wide",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              🎯 Nova Configuração
            </h4>

            {/* Dropdown Kanban */}
            <div className="space-y-2">
              <label className={cn(
                "text-sm font-medium",
                isDark ? "text-zinc-300" : "text-zinc-700"
              )}>
                Kanban
              </label>
              <Select
                value={selectedFunnelId}
                onValueChange={handleFunnelChange}
                disabled={loadingFunnels || processing || success}
              >
                <SelectTrigger className={cn(
                  "w-full",
                  isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-300"
                )}>
                  <SelectValue placeholder="Selecione um kanban" />
                </SelectTrigger>
                <SelectContent className={cn(
                  isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-300"
                )}>
                  {loadingFunnels ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    funnels.map(funnel => (
                      <SelectItem key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown Coluna */}
            <div className="space-y-2">
              <label className={cn(
                "text-sm font-medium",
                isDark ? "text-zinc-300" : "text-zinc-700"
              )}>
                Coluna
              </label>
              <Select
                value={selectedColumnId}
                onValueChange={setSelectedColumnId}
                disabled={!selectedFunnelId || loadingFunnels || processing || success}
              >
                <SelectTrigger className={cn(
                  "w-full",
                  isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-300"
                )}>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent className={cn(
                  isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-300"
                )}>
                  {selectedFunnel?.columns.map(column => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aviso */}
          {!success && (
            <div className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              isCurrentLocation
                ? isDark ? "bg-yellow-950/20 border-yellow-900/50" : "bg-yellow-50 border-yellow-200"
                : isDark ? "bg-blue-950/20 border-blue-900/50" : "bg-blue-50 border-blue-200"
            )}>
              <AlertCircle className={cn(
                "w-5 h-5 mt-0.5 shrink-0",
                isCurrentLocation ? "text-yellow-500" : "text-blue-500"
              )} />
              <div className="text-sm space-y-1">
                {isCurrentLocation ? (
                  <p className={isDark ? "text-yellow-200" : "text-yellow-900"}>
                    Os leads já estão nesta coluna. Selecione uma coluna diferente.
                  </p>
                ) : (
                  <>
                    <p className={isDark ? "text-blue-200" : "text-blue-900"}>
                      Esta ação moverá todos os <strong>{leadCount} leads</strong> desta execução para a coluna selecionada.
                    </p>
                    <p className={isDark ? "text-blue-300/80" : "text-blue-800/80"}>
                      O processamento pode levar alguns {leadCount > 500 ? 'minutos' : 'segundos'} para grandes volumes.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sucesso */}
          {success && (
            <div className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              isDark ? "bg-green-950/20 border-green-900/50" : "bg-green-50 border-green-200"
            )}>
              <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-green-500" />
              <div className="text-sm">
                <p className={isDark ? "text-green-200" : "text-green-900"}>
                  ✅ {leadCount} leads movidos com sucesso!
                </p>
                <p className={cn("mt-1", isDark ? "text-green-300/80" : "text-green-800/80")}>
                  Fechando automaticamente...
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={cn(
          "p-6 pt-4 border-t",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing || success}
            className={cn(
              isDark && "border-zinc-800 hover:bg-zinc-900"
            )}
          >
            {success ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCurrentLocation || processing || success || loadingFunnels}
            className={cn(
              "gap-2",
              success && "bg-green-600 hover:bg-green-600"
            )}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Concluído
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Confirmar Movimentação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}