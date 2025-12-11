import { useState, useEffect } from 'react';
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

interface MoveColumnLeadsModalProps {
  theme: Theme;
  sourceColumnId: string;
  sourceColumnTitle: string;
  sourceFunnelId: string;
  sourceFunnelName: string;
  leadCount: number;
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
        leadCount
      });

      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[MoveColumnLeadsModal] Chamando RPC queue_column_leads_migration...');
      
      // Chamar função RPC do Supabase
      const { data, error } = await supabase.rpc('queue_column_leads_migration', {
        p_source_column_id: sourceColumnId,
        p_target_funnel_id: selectedFunnelId,
        p_target_column_id: selectedColumnId,
        p_batch_size: 100
      });

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
      
      // Processar a fila imediatamente para melhor UX
      console.log('[MoveColumnLeadsModal] 🚀 Processando fila imediatamente...');
      try {
        const { data: { session: processSession } } = await supabase.auth.getSession();
        if (processSession?.access_token) {
          const processResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/process-column-leads-migration-queue`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${processSession.access_token}`,
              },
              body: JSON.stringify({ batch_size: 100 }),
            }
          );

          if (processResponse.ok) {
            const processResult = await processResponse.json();
            console.log('[MoveColumnLeadsModal] ✅ Fila processada:', processResult);
            
            if (processResult.total_leads_moved > 0) {
              toast.success(`✅ ${processResult.total_leads_moved} lead(s) movido(s) com sucesso!`);
            } else {
              toast.success(`✅ Movimentação enfileirada: ${leadCount} leads serão movidos em breve!`);
            }
          } else {
            console.warn('[MoveColumnLeadsModal] ⚠️ Erro ao processar fila imediatamente, mas a movimentação foi enfileirada');
            toast.success(`✅ Movimentação enfileirada: ${leadCount} leads serão movidos em breve!`);
          }
        }
      } catch (processError) {
        console.warn('[MoveColumnLeadsModal] ⚠️ Erro ao processar fila imediatamente, mas a movimentação foi enfileirada:', processError);
        toast.success(`✅ Movimentação enfileirada: ${leadCount} leads serão movidos em breve!`);
      }
      
      setSuccess(true);

      // Fechar modal após 2 segundos
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
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
                Enfileirando...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Enfileirado!
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

