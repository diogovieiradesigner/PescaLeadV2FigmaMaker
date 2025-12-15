import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
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

interface LeadFilters {
  hasEmail?: boolean;
  hasWhatsapp?: boolean;
  searchQuery?: string;
}

interface MoveColumnLeadsModalProps {
  theme: Theme;
  sourceColumnId: string;
  sourceColumnTitle: string;
  sourceFunnelId: string;
  sourceFunnelName: string;
  leadCount: number;
  filters?: LeadFilters;
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

export function MoveColumnLeadsModal({
  theme,
  sourceColumnId,
  sourceColumnTitle,
  sourceFunnelId,
  sourceFunnelName,
  leadCount,
  filters,
  open,
  onOpenChange,
  onSuccess,
}: MoveColumnLeadsModalProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string>('');
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
      setSelectedFunnelId('');
      setSelectedColumnId('');
      setProcessing(false);
      setProcessingProgress('');
      setSuccess(false);
    }
  }, [open]);

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
    } else {
      setSelectedColumnId('');
    }
  };

  const handleConfirm = async () => {
    if (!selectedFunnelId || !selectedColumnId) {
      toast.error('Selecione um kanban e uma coluna');
      return;
    }

    // Validar se não é a mesma coluna
    if (selectedFunnelId === sourceFunnelId && selectedColumnId === sourceColumnId) {
      toast.error('Os leads já estão nesta coluna');
      return;
    }

    setProcessing(true);

    try {
      console.log('[MoveColumnLeadsModal] Iniciando movimentação:', {
        sourceColumnId,
        sourceColumnTitle,
        sourceFunnelId,
        sourceFunnelName,
        targetFunnelId: selectedFunnelId,
        targetColumnId: selectedColumnId,
        leadCount,
        filters: filters || 'sem filtros'
      });

      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[MoveColumnLeadsModal] Chamando RPC queue_column_leads_migration...');

      // Preparar parâmetros da RPC incluindo filtros
      const rpcParams: Record<string, any> = {
        p_source_column_id: sourceColumnId,
        p_target_funnel_id: selectedFunnelId,
        p_target_column_id: selectedColumnId,
        p_batch_size: 100,
        // Passar filtros se existirem
        p_filter_has_email: filters?.hasEmail || null,
        p_filter_has_whatsapp: filters?.hasWhatsapp || null,
        p_filter_search_query: filters?.searchQuery || null,
      };

      console.log('[MoveColumnLeadsModal] Parâmetros RPC:', rpcParams);

      // Chamar função RPC do Supabase
      const { data, error } = await supabase.rpc('queue_column_leads_migration', rpcParams);

      console.log('[MoveColumnLeadsModal] Resposta RPC:', { data, error });

      if (error) {
        console.error('[MoveColumnLeadsModal] Erro na chamada RPC:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        console.error('[MoveColumnLeadsModal] RPC retornou success=false:', data);
        throw new Error(data?.error || 'Erro desconhecido ao processar movimentação');
      }

      console.log('[MoveColumnLeadsModal] ✅ Movimentação enfileirada com sucesso:', data);
      
      // Processar a fila até completar todos os leads
      console.log('[MoveColumnLeadsModal] 🚀 Processando fila até completar...');
      let totalMoved = 0;
      let attempts = 0;
      const BATCH_SIZE = 25;
      const PARALLEL_CALLS = 5;
      const maxAttempts = Math.ceil(data.total_leads / BATCH_SIZE) + 5;

      try {
        const { data: { session: processSession } } = await supabase.auth.getSession();

        if (processSession?.access_token) {
          // Função para processar um batch
          const processBatch = async (): Promise<{ moved: number; finished: boolean }> => {
            try {
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/process-column-leads-migration-queue`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${processSession.access_token}`,
                  },
                  body: JSON.stringify({ batch_size: BATCH_SIZE }),
                }
              );

              if (response.ok) {
                const result = await response.json();
                const moved = result.total_leads_moved || 0;
                const finished = result.batches_processed === 0 ||
                                 result.message === 'Nenhuma mensagem na fila' ||
                                 result.results?.[result.results.length - 1]?.leads_remaining === 0;
                return { moved, finished };
              }
              return { moved: 0, finished: true };
            } catch {
              return { moved: 0, finished: false };
            }
          };

          // Loop principal com chamadas paralelas
          let finished = false;

          const processRound = async () => {
            if (finished || attempts >= maxAttempts) return;

            attempts++;
            console.log(`[MoveColumnLeadsModal] 📦 Rodada ${attempts} - ${PARALLEL_CALLS} batches em paralelo...`);

            // Executar múltiplos batches em paralelo
            const results = await Promise.all(
              Array(PARALLEL_CALLS).fill(null).map(() => processBatch())
            );

            // Somar resultados
            let roundMoved = 0;
            for (const r of results) {
              roundMoved += r.moved;
              if (r.finished) finished = true;
            }

            totalMoved += roundMoved;
            console.log(`[MoveColumnLeadsModal] ✅ Rodada ${attempts}: +${roundMoved} leads (total: ${totalMoved})`);

            // Se não moveu nada nesta rodada, provavelmente terminou
            if (roundMoved === 0) {
              finished = true;
            }

            return { roundMoved, finished };
          };

          // Processar em loop com updates visuais
          while (!finished && attempts < maxAttempts) {
            // Forçar React a renderizar IMEDIATAMENTE
            flushSync(() => {
              setProcessingProgress(`${totalMoved}/${data.total_leads}`);
            });

            // Processar rodada
            const result = await processRound();

            // Forçar atualização visual após processar
            flushSync(() => {
              setProcessingProgress(`${totalMoved}/${data.total_leads}`);
            });

            // Atualizar kanban a cada rodada
            if (result?.roundMoved && result.roundMoved > 0 && onSuccess) {
              onSuccess();
            }

            // Delay entre rodadas
            if (!finished) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
        }

        // Atualização final
        if (onSuccess) {
          onSuccess();
        }

        // Mostrar resultado final
        if (totalMoved > 0) {
          toast.success(`✅ ${totalMoved} lead(s) movido(s) com sucesso!`);
        } else {
          toast.success(`✅ Movimentação concluída!`);
        }
      } catch (processError) {
        console.warn('[MoveColumnLeadsModal] ⚠️ Erro ao processar fila:', processError);
        if (onSuccess) onSuccess();
        toast.success(`✅ Movimentação em andamento...`);
      }

      setSuccess(true);
      setProcessingProgress(`${data.total_leads}/${data.total_leads}`);

      // Fechar modal após 1.5 segundos
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      console.error('[MoveColumnLeadsModal] ❌ Erro ao mover leads:', error);
      toast.error(error.message || 'Erro ao mover leads');
      setProcessing(false);
    }
  };

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  const selectedColumn = selectedFunnel?.columns.find(c => c.id === selectedColumnId);
  const isCurrentLocation = selectedFunnelId === sourceFunnelId && selectedColumnId === sourceColumnId;

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
            Mover Todos os Leads da Coluna
          </DialogTitle>
          <DialogDescription className={cn(
            "text-sm mt-2",
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            Mova todos os leads desta coluna para outra coluna ou kanban
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Informações da Coluna */}
          <div className={cn(
            "p-4 rounded-lg border",
            isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
          )}>
            <h4 className={cn(
              "text-xs font-medium uppercase tracking-wide mb-3",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              📊 Coluna Origem
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>Kanban:</span>
                <p className={cn(
                  "font-medium mt-1",
                  isDark ? "text-white" : "text-zinc-900"
                )}>{sourceFunnelName}</p>
              </div>
              <div>
                <span className={cn(
                  "text-xs",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>Coluna:</span>
                <p className={cn(
                  "font-medium mt-1",
                  isDark ? "text-white" : "text-zinc-900"
                )}>{sourceColumnTitle}</p>
              </div>
              <div className="col-span-2">
                <span className={cn(
                  "text-xs",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>Total de Leads:</span>
                <p className={cn(
                  "font-medium mt-1 text-lg",
                  isDark ? "text-white" : "text-zinc-900"
                )}>{leadCount} leads</p>
              </div>
              {/* Mostrar filtros ativos */}
              {filters && (filters.hasEmail || filters.hasWhatsapp || filters.searchQuery) && (
                <div className="col-span-2 mt-2">
                  <span className={cn(
                    "text-xs",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>Filtros ativos:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {filters.hasEmail && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"
                      )}>
                        📧 Com e-mail
                      </span>
                    )}
                    {filters.hasWhatsapp && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700"
                      )}>
                        📱 Com WhatsApp
                      </span>
                    )}
                    {filters.searchQuery && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"
                      )}>
                        🔍 "{filters.searchQuery}"
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seleção de Destino */}
          <div className="space-y-4">
            <div>
              <label className={cn(
                "block text-sm font-medium mb-2",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                Kanban Destino
              </label>
              {loadingFunnels ? (
                <div className={cn(
                  "flex items-center justify-center p-4 rounded-lg border",
                  isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <Select value={selectedFunnelId} onValueChange={handleFunnelChange}>
                  <SelectTrigger className={cn(
                    isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200"
                  )}>
                    <SelectValue placeholder="Selecione um kanban" />
                  </SelectTrigger>
                  <SelectContent className={cn(
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                  )}>
                    {funnels.map((funnel) => (
                      <SelectItem
                        key={funnel.id}
                        value={funnel.id}
                        className={cn(
                          isDark ? "text-white hover:bg-zinc-800" : "text-zinc-900 hover:bg-zinc-50"
                        )}
                      >
                        {funnel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedFunnelId && (
              <div>
                <label className={cn(
                  "block text-sm font-medium mb-2",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  Coluna Destino
                </label>
                <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                  <SelectTrigger className={cn(
                    isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200"
                  )}>
                    <SelectValue placeholder="Selecione uma coluna" />
                  </SelectTrigger>
                  <SelectContent className={cn(
                    isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                  )}>
                    {selectedFunnel?.columns.map((column) => (
                      <SelectItem
                        key={column.id}
                        value={column.id}
                        className={cn(
                          isDark ? "text-white hover:bg-zinc-800" : "text-zinc-900 hover:bg-zinc-50"
                        )}
                      >
                        {column.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview do Destino */}
            {selectedFunnel && selectedColumn && (
              <div className={cn(
                "p-4 rounded-lg border",
                isCurrentLocation
                  ? isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"
                  : isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"
              )}>
                <div className="flex items-start gap-3">
                  {isCurrentLocation ? (
                    <AlertCircle className={cn(
                      "w-5 h-5 mt-0.5",
                      isDark ? "text-yellow-400" : "text-yellow-600"
                    )} />
                  ) : (
                    <CheckCircle className={cn(
                      "w-5 h-5 mt-0.5",
                      isDark ? "text-blue-400" : "text-blue-600"
                    )} />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium mb-1",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {isCurrentLocation ? 'Atenção: Mesma coluna' : 'Destino selecionado'}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    )}>
                      {selectedFunnel.name} → {selectedColumn.title}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className={cn(
          "p-6 pt-4 border-t gap-2",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing || success}
            className={cn(
              isDark ? "border-zinc-800 hover:bg-zinc-900" : "border-zinc-200 hover:bg-zinc-50"
            )}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFunnelId || !selectedColumnId || processing || success || isCurrentLocation}
            className={cn(
              "min-w-[120px]",
              isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {processingProgress ? `Movendo ${processingProgress}...` : 'Iniciando...'}
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluído!
              </>
            ) : (
              'Mover Leads'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

