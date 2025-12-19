import { useState, useEffect, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowLeft,
  Clock,
  Zap,
  Sun,
  Moon,
  Filter,
  ChevronDown,
  Play,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { ProfileMenu } from './ProfileMenu';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from './ui/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface CampaignDetailsViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  runId: string;
  onBack: () => void;
  onNavigateToSettings?: () => void;
  onRefresh?: () => void;
}

interface CampaignAnalytics {
  run: {
    id: string;
    config_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    run_date: string;
    leads_total: number;
    leads_processed: number;
    leads_success: number;
    leads_failed: number;
    started_at: string;
    completed_at: string;
    duration_seconds: number;
    duration_formatted: string;
    progress_percent: number;
    success_rate: number;
    workspace_id: string;
    inbox_name: string;
    funnel_name: string;
    source_column: string;
    target_column: string;
    daily_limit: number;
  };
  mensagens: {
    total: number;
    por_status: {
      pending: number;
      queued: number;
      generating: number;
      sending: number;
      sent: number;
      failed: number;
      skipped: number;
      replied: number;
    };
    com_conversa: number;
    com_telefone: number;
    com_mensagem_gerada: number;
    com_retry: number;
    media_retries: number;
  };
  ia: {
    tokens_total: number;
    tokens_media: number;
    tempo_geracao_medio_ms: number;
    custo_estimado: number;
  };
  taxas: {
    envio: number;
    falha: number;
    resposta: number;
    geracao_ia: number;
  };
  graficos: {
    pizza_status: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    barras_progresso: Array<{
      etapa: string;
      quantidade: number;
    }>;
  };
  timeline: Array<{
    timestamp: string;
    datetime: string;
    step: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    icon: string;
    color: string;
  }>;
  logs_count: number;
  gerado_em: string;
}

interface CampaignLog {
  id: string;
  step_number: number;
  step_name: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details: any;
  lead_id: string | null;
  message_id: string | null;
  timestamp: string;
  datetime: string;
  icon: string;
}

interface CampaignLogsResponse {
  total: number;
  logs: CampaignLog[];
}

type LogLevelFilter = 'all' | 'info' | 'warning' | 'error' | 'success';

type LogTabType = 'execution' | 'queue' | 'all';

interface QueueMessage {
  message_id: string;
  run_id: string;
  lead_id: string;
  lead_name: string;
  phone_number: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  time_until_send: string | null;
  position_in_queue: number;
  generated_message: string | null;
  ai_model: string | null;
  error_message: string | null;
}

interface QueueSummary {
  run_id: string;
  run_status: string;
  run_started_at: string;
  total_messages: number;
  pending_count: number;
  sent_count: number;
  failed_count: number;
  next_scheduled_at: string | null;
  next_lead_name: string | null;
  next_phone: string | null;
  time_until_next: string | null;
  last_sent_at: string | null;
  last_lead_name: string | null;
}

// ============================================
// 🕐 Função para formatar horário de envio de forma legível
// ============================================
function formatScheduledTime(scheduledAt: string | null, timeUntilSend: string | null): string {
  if (!scheduledAt) return 'Horário não definido';

  try {
    const scheduled = new Date(scheduledAt);
    const now = new Date();

    // Formatar horário absoluto (HH:mm:ss)
    const timeStr = scheduled.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Calcular diferença em segundos
    const diffMs = scheduled.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 0) {
      // Já passou do horário - está atrasado
      const absSeconds = Math.abs(diffSeconds);
      if (absSeconds < 60) {
        return `${timeStr} (atrasado ${absSeconds}s)`;
      } else if (absSeconds < 3600) {
        const mins = Math.floor(absSeconds / 60);
        return `${timeStr} (atrasado ${mins}min)`;
      } else {
        const hours = Math.floor(absSeconds / 3600);
        const mins = Math.floor((absSeconds % 3600) / 60);
        return `${timeStr} (atrasado ${hours}h ${mins}min)`;
      }
    } else {
      // Falta tempo para enviar
      if (diffSeconds < 60) {
        return `${timeStr} (em ${diffSeconds}s)`;
      } else if (diffSeconds < 3600) {
        const mins = Math.floor(diffSeconds / 60);
        const secs = diffSeconds % 60;
        return `${timeStr} (em ${mins}min ${secs}s)`;
      } else {
        const hours = Math.floor(diffSeconds / 3600);
        const mins = Math.floor((diffSeconds % 3600) / 60);
        return `${timeStr} (em ${hours}h ${mins}min)`;
      }
    }
  } catch (e) {
    // Se falhar, tentar usar o time_until_send diretamente
    if (timeUntilSend) {
      // Verificar se é negativo (atrasado)
      if (timeUntilSend.startsWith('-')) {
        return `Atrasado: ${timeUntilSend.substring(1)}`;
      }
      return `Em: ${timeUntilSend}`;
    }
    return 'Horário inválido';
  }
}

// Donut Chart Component with Hover
interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  colors: string[];
  category: string;
}

function DonutChart({ data, title, colors, category, isDark }: DonutChartProps & { isDark: boolean }) {
  const [hoveredItem, setHoveredItem] = useState<{ name: string; value: number } | null>(null);

  return (
    <Card className={cn(
      isDark 
        ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
        : "bg-white border border-zinc-200"
    )}>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>{title}</h4>
        </div>
        <div className="relative flex items-center justify-center w-full" style={{ height: '200px', minHeight: '200px' }}>
          <ResponsiveContainer width="100%" height={200} minHeight={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                strokeWidth={0}
                onMouseEnter={(_, index) => setHoveredItem(data[index])}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                    opacity={hoveredItem ? (hoveredItem.name === entry.name ? 1 : 0.5) : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <div className={cn(
              "text-3xl font-bold transition-all duration-200",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {hoveredItem ? hoveredItem.value : (data.length > 0 ? Math.max(...data.map(d => d.value)) : 0)}
            </div>
            <div className={cn(
              "text-xs transition-all duration-200",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {hoveredItem ? hoveredItem.name : (data.length > 0 ? data.reduce((max, item) => item.value > max.value ? item : max, data[0]).name : category)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      setDisplayValue(Math.floor(easedProgress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <>{displayValue}</>;
}

// Animated progress bar component
function AnimatedProgressBar({ percentage, className, isDark = true }: { percentage: number; className?: string; isDark?: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn(
      "relative h-2 w-full rounded-full overflow-hidden",
      isDark 
        ? "bg-zinc-900" 
        : "bg-white border border-zinc-300"
    )}>
      <div 
        className={cn(
          "absolute top-0 left-0 h-full transition-all duration-1000 ease-out", 
          isDark ? "bg-white" : "bg-zinc-900",
          className
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Mini progress bar for metric cards
function MiniProgressBar({ percentage, isDark }: { percentage: number; isDark: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn(
      "relative h-[2px] w-16 rounded-full overflow-hidden",
      isDark ? "bg-zinc-800" : "bg-zinc-200"
    )}>
      <div 
        className={cn(
          "absolute top-0 left-0 h-full transition-all duration-1000 ease-out",
          isDark ? "bg-zinc-600" : "bg-zinc-400"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function CampaignDetailsView({ theme, onThemeToggle, runId, onBack, onNavigateToSettings, onRefresh }: CampaignDetailsViewProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Estados para logs separados
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LogLevelFilter>('all');
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  
  // Estados para aba de logs
  const [logTab, setLogTab] = useState<LogTabType>('all');
  
  // Estados para fila de campanhas
  const [queueMessages, setQueueMessages] = useState<QueueMessage[]>([]);
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Ref para armazenar o workspace inicial
  const initialWorkspaceId = useRef(currentWorkspace?.id);

  // Detectar mudança de workspace e voltar automaticamente
  useEffect(() => {
    if (!currentWorkspace?.id || !initialWorkspaceId.current) {
      initialWorkspaceId.current = currentWorkspace?.id;
      return;
    }

    // Se o workspace mudou, voltar para a lista
    if (currentWorkspace.id !== initialWorkspaceId.current) {
      console.log('🔄 Workspace mudou, voltando para a lista de campanhas...');
      toast.info('Workspace alterado. Redirecionando...');
      onBack();
    }
  }, [currentWorkspace?.id, onBack]);

  // Função para carregar detalhes da run
  const loadRunDetails = async () => {
    if (!runId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_campaign_analytics', {
        p_run_id: runId,
        p_workspace_id: null // Não precisa filtrar por workspace, runId já é único
      });

      if (rpcError) {
        console.error('Erro ao carregar analytics da campanha:', rpcError);
        toast.error('Erro ao carregar analytics da campanha');
        setError('Erro ao carregar analytics da campanha');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Campanha não encontrada');
        toast.error('Campanha não encontrada');
        setLoading(false);
        return;
      }

      console.log('Analytics carregado:', data);
      setAnalytics(data);
    } catch (err) {
      console.error('Erro ao buscar analytics:', err);
      toast.error('Erro ao buscar analytics da campanha');
      setError('Erro ao buscar analytics da campanha');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados reais da API
  useEffect(() => {
    loadRunDetails();
  }, [runId]);

  // Auto-refresh a cada 20 segundos quando a campanha estiver rodando
  useEffect(() => {
    // Só atualiza automaticamente se estiver com status 'running'
    if (analytics?.run.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      console.log('Auto-refresh: recarregando dados da campanha...');
      loadRunDetails();
    }, 20000); // 20 segundos

    return () => clearInterval(interval);
  }, [analytics?.run.status, runId]);

  // Carregar dados da fila de campanhas
  const loadQueueData = async () => {
    if (!runId || !analytics?.run.workspace_id) return;

    setQueueLoading(true);
    setQueueError(null);

    try {
      // Buscar resumo
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_campaign_schedule_summary', {
        p_workspace_id: analytics.run.workspace_id,
        p_run_id: runId
      });

      if (summaryError) {
        console.error('Erro ao carregar resumo da fila:', summaryError);
        setQueueError('Erro ao carregar resumo');
        setQueueLoading(false);
        return;
      }

      if (summaryData && summaryData.length > 0) {
        setQueueSummary(summaryData[0]);
      }

      // Buscar mensagens pendentes
      const { data: messagesData, error: messagesError } = await supabase.rpc('get_campaign_schedule', {
        p_workspace_id: analytics.run.workspace_id,
        p_run_id: runId,
        p_status: 'pending'
      });

      if (messagesError) {
        console.error('Erro ao carregar mensagens da fila:', messagesError);
        setQueueError('Erro ao carregar mensagens');
        setQueueLoading(false);
        return;
      }

      setQueueMessages(messagesData || []);
    } catch (err) {
      console.error('Erro ao buscar dados da fila:', err);
      setQueueError('Erro ao buscar dados da fila');
    } finally {
      setQueueLoading(false);
    }
  };

  // Carregar fila quando necessário
  useEffect(() => {
    if ((logTab === 'queue' || logTab === 'all') && analytics?.run.workspace_id) {
      loadQueueData();
    }
  }, [logTab, runId, analytics?.run.workspace_id]);

  // Auto-refresh da fila a cada 30 segundos quando a aba estiver aberta
  useEffect(() => {
    if ((logTab === 'queue' || logTab === 'all') && analytics?.run.status === 'running') {
      const interval = setInterval(() => {
        loadQueueData();
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    }
  }, [logTab, analytics?.run.status, runId, analytics?.run.workspace_id]);

  // Carregar logs separadamente com paginação e filtros
  useEffect(() => {
    async function loadLogs(reset = true) {
      if (!runId) return;

      setLogsLoading(true);
      if (reset) {
        setLogsError(null);
        setLogs([]);
      }

      try {
        const params: any = {
          p_run_id: runId,
          p_limit: 100,
          p_after_id: reset ? null : (logs.length > 0 ? logs[logs.length - 1].id : null),
        };

        // Adicionar filtro de nível se não for 'all'
        if (selectedLevel !== 'all') {
          params.p_level = selectedLevel;
        }

        const { data, error: rpcError } = await supabase.rpc('get_campaign_logs', params);

        if (rpcError) {
          console.error('Erro ao carregar logs da campanha:', rpcError);
          toast.error('Erro ao carregar logs da campanha');
          setLogsError('Erro ao carregar logs');
          setLogsLoading(false);
          return;
        }

        if (!data) {
          setLogsError('Logs não encontrados');
          setLogsLoading(false);
          return;
        }

        console.log('Logs carregados:', data);
        
        if (reset) {
          setLogs(data.logs || []);
        } else {
          setLogs(prev => [...prev, ...(data.logs || [])]);
        }
        
        setLogsTotal(data.total || 0);
        setHasMoreLogs((data.logs || []).length === 100);
      } catch (err) {
        console.error('Erro ao buscar logs:', err);
        toast.error('Erro ao buscar logs da campanha');
        setLogsError('Erro ao buscar logs');
      } finally {
        setLogsLoading(false);
      }
    }

    loadLogs(true);
  }, [runId, selectedLevel, supabase]);

  // Função para carregar mais logs (paginação)
  const loadMoreLogs = async () => {
    if (!runId || logsLoading || !hasMoreLogs) return;

    setLogsLoading(true);

    try {
      const params: any = {
        p_run_id: runId,
        p_limit: 100,
        p_after_id: logs.length > 0 ? logs[logs.length - 1].id : null,
      };

      if (selectedLevel !== 'all') {
        params.p_level = selectedLevel;
      }

      const { data, error: rpcError } = await supabase.rpc('get_campaign_logs', params);

      if (rpcError) {
        console.error('Erro ao carregar mais logs:', rpcError);
        toast.error('Erro ao carregar mais logs');
        return;
      }

      if (data && data.logs) {
        setLogs(prev => [...prev, ...data.logs]);
        setHasMoreLogs(data.logs.length === 100);
      }
    } catch (err) {
      console.error('Erro ao carregar mais logs:', err);
      toast.error('Erro ao carregar mais logs');
    } finally {
      setLogsLoading(false);
    }
  };

  // Função para obter cor do log baseado no nível
  const getLogLevelColor = (level: string) => {
    const colors = {
      success: '#22c55e',
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
    };
    return colors[level as keyof typeof colors] || '#6b7280';
  };

  // Funções de controle de campanha
  const executeCampaignNow = async () => {
    if (!analytics?.run.config_id) return;

    setIsActionLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('campaign-execute-now', {
        body: { config_id: analytics.run.config_id }
      });

      if (error || data?.error) {
        toast.error(data?.error || error.message || 'Erro ao executar campanha');
        return;
      }

      toast.success(`${data.leads_scheduled} leads agendados!`);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao executar campanha:', err);
      toast.error('Erro ao executar campanha');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Funções de pausar/resumir removidas - funcionalidade descontinuada

  const cancelCampaign = async () => {
    if (!analytics?.run.id) return;

    // Validação de status
    if (!['running', 'paused'].includes(analytics.run.status)) {
      toast.error(`Apenas campanhas em execução ou pausadas podem ser canceladas. Status atual: ${analytics.run.status}`);
      return;
    }

    // Confirmação já é feita pelo AlertDialog customizado

    setIsActionLoading(true);

    try {
      const { data, error } = await supabase.rpc('cancel_campaign_run', {
        p_run_id: analytics.run.id
      });

      if (error) {
        toast.error('Erro ao cancelar campanha');
        console.error('Erro ao cancelar campanha:', error);
        return;
      }

      // Verificar se retornou erro do SQL
      if (data?.error) {
        toast.error(data.error);
        console.error('Erro SQL:', data);
        return;
      }

      toast.success(`Campanha cancelada! ${data?.messages_cancelled || 0} mensagens canceladas`);
      
      // Recarregar dados locais
      await loadRunDetails();
      await loadQueueData(); // Atualizar fila também
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao cancelar campanha:', err);
      toast.error('Erro ao cancelar campanha');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (!analytics?.run) return null;

    const statusMap = {
      pending: { 
        icon: Clock, 
        text: 'Aguardando', 
        variant: 'secondary' as const,
        color: 'text-gray-500'
      },
      running: { 
        icon: Zap, 
        text: 'Em andamento', 
        variant: 'default' as const,
        color: 'text-blue-500'
      },
      completed: { 
        icon: CheckCircle, 
        text: 'Concluído', 
        variant: 'default' as const,
        color: 'text-green-500'
      },
      failed: { 
        icon: XCircle, 
        text: 'Falhou', 
        variant: 'destructive' as const,
        color: 'text-red-500'
      },
      cancelled: { 
        icon: AlertCircle, 
        text: 'Cancelado', 
        variant: 'destructive' as const,
        color: 'text-yellow-500'
      }
    };

    return statusMap[analytics.run.status as keyof typeof statusMap] || statusMap.pending;
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        "h-screen flex flex-col transition-colors",
        isDark ? "bg-black" : "bg-zinc-50"
      )}>
        <div className={cn(
          "h-16 border-b flex items-center justify-between px-6 transition-colors shrink-0",
          isDark ? "bg-black border-zinc-800" : "bg-white border-zinc-200"
        )}>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className={cn(
                "rounded-full",
                isDark ? "hover:bg-zinc-900" : "hover:bg-zinc-100"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className={cn("text-lg", isDark ? "text-white" : "text-zinc-900")}>
              Detalhes da Campanha
            </h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className={cn(
              "w-8 h-8 animate-spin",
              isDark ? "text-white/50" : "text-zinc-500"
            )} />
            <p className={cn(
              "text-sm",
              isDark ? "text-white/50" : "text-zinc-600"
            )}>
              Carregando detalhes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !analytics) {
    return (
      <div className={cn(
        "h-screen flex flex-col transition-colors",
        isDark ? "bg-black" : "bg-zinc-50"
      )}>
        <div className={cn(
          "h-16 border-b flex items-center justify-between px-6 transition-colors shrink-0",
          isDark ? "bg-black border-zinc-800" : "bg-white border-zinc-200"
        )}>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className={cn(
                "rounded-full",
                isDark ? "hover:bg-zinc-900" : "hover:bg-zinc-100"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className={cn("text-lg", isDark ? "text-white" : "text-zinc-900")}>
              Detalhes da Campanha
            </h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className={cn(
              "w-8 h-8",
              isDark ? "text-red-500" : "text-red-600"
            )} />
            <p className={cn(
              "text-sm",
              isDark ? "text-white/70" : "text-zinc-700"
            )}>
              {error || 'Campanha não encontrada'}
            </p>
            <Button onClick={onBack} variant="outline" className="mt-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Campanhas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className={cn(
      "h-screen flex flex-col transition-colors",
      isDark ? "bg-black" : "bg-zinc-50"
    )}>
      {/* Header */}
      <div className={cn(
        "h-16 border-b flex items-center justify-between px-6 transition-colors shrink-0",
        isDark ? "bg-black border-zinc-800" : "bg-white border-zinc-200"
      )}>
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className={cn(
              "rounded-full",
              isDark ? "hover:bg-zinc-900" : "hover:bg-zinc-100"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className={cn("text-lg", isDark ? "text-white" : "text-zinc-900")}>
              Detalhes da Campanha
            </h1>
            <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>
              {analytics.run.funnel_name} • {analytics.run.source_column} → {analytics.run.target_column}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Botão de cancelar campanha */}
          {analytics.run.status === 'running' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm"
                  disabled={isActionLoading}
                  className={cn(
                    "gap-2 border-0",
                    isDark 
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" 
                      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className={cn(
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
              )}>
                <AlertDialogHeader>
                  <AlertDialogTitle className={isDark ? "text-white" : "text-zinc-900"}>
                    Cancelar Campanha?
                  </AlertDialogTitle>
                  <AlertDialogDescription className={isDark ? "text-zinc-400" : "text-zinc-600"}>
                    Esta ação não pode ser desfeita. {analytics.run.leads_total - analytics.run.leads_processed} mensagens pendentes serão canceladas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className={cn(
                    isDark 
                      ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" 
                      : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  )}>
                    Voltar
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={cancelCampaign}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirmar Cancelamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {statusConfig && (
            <Badge variant={statusConfig.variant} className={cn("gap-1.5", statusConfig.color)}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.text}
            </Badge>
          )}

          <button 
            onClick={onThemeToggle}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isDark ? "hover:bg-zinc-900" : "hover:bg-zinc-100"
            )}
          >
            {isDark ? <Sun className="w-4 h-4 text-zinc-500" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          {onNavigateToSettings && <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />}
        </div>
      </div>

      {/* Content - Layout igual ExtractionProgress */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Left Column - Main Stats */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">
            
            {/* Progress Card */}
            <Card 
              className={cn(
                "rounded-xl",
                isDark 
                  ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                  : "bg-white border border-zinc-200"
              )}
              style={{
                borderRadius: '0.75rem',
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>
                  Progresso Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <p className={cn(
                        "text-5xl font-bold tracking-tight",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        <AnimatedCounter value={analytics.run.leads_processed} />
                      </p>
                      <p className={cn(
                        "text-sm",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>
                        de {analytics.run.leads_total} leads processados
                      </p>
                    </div>
                    <div className="text-right mb-2">
                      <p className={cn(
                        "text-4xl font-bold",
                        isDark ? "text-zinc-700" : "text-zinc-300"
                      )}>
                        <AnimatedCounter value={analytics.run.progress_percent} />%
                      </p>
                    </div>
                  </div>
                  <AnimatedProgressBar 
                    percentage={analytics.run.progress_percent} 
                    isDark={isDark} 
                  />
                  <div className={cn(
                    "flex justify-between text-xs font-mono",
                    isDark ? "text-zinc-600" : "text-zinc-500"
                  )}>
                    <span>Início: {new Date(analytics.run.started_at).toLocaleString('pt-BR')}</span>
                    <span>Duração: {analytics.run.duration_formatted}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards Principais - Enviadas e Respostas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mensagens Enviadas */}
              <Card className={cn(
                isDark 
                  ? "bg-gradient-to-br from-green-950/20 via-zinc-950 to-black border border-green-900/30" 
                  : "bg-white border border-zinc-200"
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-base font-semibold uppercase",
                          isDark ? "text-green-400" : "text-green-600"
                        )}>Mensagens Enviadas</span>
                      </div>
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>Leads que receberam mensagem</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className={cn(
                      "text-5xl font-bold",
                      isDark ? "text-green-500" : "text-green-600"
                    )}>
                      <AnimatedCounter value={analytics.mensagens.por_status.sent} />
                    </span>
                    <div className={cn(
                      "text-sm",
                      isDark ? "text-zinc-500" : "text-zinc-700"
                    )}>
                      <div>de {analytics.run.leads_processed} processados</div>
                      <div className="text-xs">
                        {analytics.taxas.envio}% sucesso
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "h-2 rounded-full overflow-hidden",
                    isDark ? "bg-zinc-900" : "bg-green-200"
                  )}>
                    <div 
                      className="h-full bg-green-500 transition-all duration-1000"
                      style={{ width: `${analytics.taxas.envio}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Respostas Recebidas */}
              <Card className={cn(
                isDark 
                  ? "bg-gradient-to-br from-blue-950/20 via-zinc-950 to-black border border-blue-900/30" 
                  : "bg-white border border-zinc-200"
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-base font-semibold uppercase",
                          isDark ? "text-blue-400" : "text-blue-600"
                        )}>Respostas Recebidas</span>
                      </div>
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>Leads que responderam</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className={cn(
                      "text-5xl font-bold",
                      isDark ? "text-blue-500" : "text-blue-600"
                    )}>
                      <AnimatedCounter value={analytics.mensagens.por_status.replied} />
                    </span>
                    <div className={cn(
                      "text-sm",
                      isDark ? "text-zinc-500" : "text-zinc-700"
                    )}>
                      <div>de {analytics.mensagens.por_status.sent} enviadas</div>
                      <div className="text-xs">
                        {analytics.taxas.resposta}% taxa resposta
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "h-2 rounded-full overflow-hidden",
                    isDark ? "bg-zinc-900" : "bg-blue-200"
                  )}>
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${analytics.taxas.resposta}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Seção: Status das Mensagens */}
            <div className="space-y-4">
              <h3 className={cn(
                "text-base font-semibold uppercase tracking-wider",
                isDark ? "text-zinc-400" : "text-zinc-700"
              )}>
                Status das Mensagens
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Com Telefone */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Com Telefone</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.com_telefone} />
                        </span>
                      </div>
                      <MiniProgressBar 
                        percentage={analytics.run.leads_total > 0 
                          ? (analytics.mensagens.com_telefone / analytics.run.leads_total) * 100 
                          : 0
                        } 
                        isDark={isDark} 
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Mensagem Gerada */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Mensagem Gerada</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.com_mensagem_gerada} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.taxas.geracao_ia} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>

                {/* Gerando IA */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Gerando IA</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.por_status.generating} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enviando */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Enviando</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.por_status.sending} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enviadas */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Enviadas</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold text-green-500"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.por_status.sent} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Com Falha */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Com Falha</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-red-500">
                          <AnimatedCounter value={analytics.mensagens.por_status.failed} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Respondidas */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Respondidas</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-blue-500">
                          <AnimatedCounter value={analytics.mensagens.por_status.replied} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pendentes */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Pendentes</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.por_status.pending} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Com Retry */}
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      <span className="text-xs font-medium uppercase">Com Retry</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.mensagens.com_retry} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* Métricas da IA */}
            <Card className={cn(
              isDark 
                ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                : "bg-white border border-zinc-200"
            )}>
              <CardContent className="pt-6">
                <h3 className={cn(
                  "text-lg font-semibold mb-4",
                  isDark ? "text-white" : "text-zinc-900"
                )}>Métricas da IA</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className={cn(
                      "text-sm mb-1",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>Tokens Usados</div>
                    <div className={cn(
                      "text-3xl font-bold",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      <AnimatedCounter value={analytics.ia.tokens_total} />
                    </div>
                    <div className={cn(
                      "text-xs mt-1",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )}>{analytics.ia.tokens_media}/mensagem</div>
                  </div>
                  <div>
                    <div className={cn(
                      "text-sm mb-1",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>Tempo Médio</div>
                    <div className={cn(
                      "text-3xl font-bold",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      <AnimatedCounter value={analytics.ia.tempo_geracao_medio_ms} />ms
                    </div>
                    <div className={cn(
                      "text-xs mt-1",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )}>por mensagem</div>
                  </div>

                </div>
              </CardContent>
            </Card>



          </div>

          {/* Right Column - Timeline com Logs */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
            <Card 
              className={cn(
                "flex-1 flex flex-col overflow-hidden rounded-xl",
                isDark 
                  ? "bg-black border-0" 
                  : "bg-white border border-zinc-200"
              )}
              style={{
                borderRadius: '0.75rem',
              }}
            >
              <CardHeader className={cn(
                "pb-4 shrink-0 border-b",
                isDark ? "border-zinc-900" : "border-zinc-200"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className={cn(
                    "text-base font-semibold",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    Logs Master
                  </CardTitle>
                  <Badge variant="outline" className={cn(
                    "font-normal",
                    isDark 
                      ? "bg-zinc-900 border-zinc-800 text-zinc-500" 
                      : "bg-zinc-100 border-zinc-300 text-zinc-600"
                  )}>
                    {logTab === 'execution' ? `${logsTotal} logs` : logTab === 'queue' ? `${queueMessages.length} na fila` : 'Todos'}
                  </Badge>
                </div>

                {/* Abas de Logs */}
                <div className={cn(
                  "flex items-center gap-1 pb-3",
                  isDark ? "bg-zinc-950/50" : "bg-zinc-50"
                )}>
                  <button
                    onClick={() => setLogTab('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      logTab === 'all'
                        ? isDark
                          ? "bg-zinc-800 text-white"
                          : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                        : isDark
                          ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setLogTab('execution')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      logTab === 'execution'
                        ? isDark
                          ? "bg-zinc-800 text-white"
                          : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                        : isDark
                          ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    Execução
                  </button>
                  <button
                    onClick={() => setLogTab('queue')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      logTab === 'queue'
                        ? isDark
                          ? "bg-zinc-800 text-white"
                          : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                        : isDark
                          ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    Fila
                  </button>
                </div>

                {/* Filtros de Nível (apenas para aba execution) */}
                {(logTab === 'execution' || logTab === 'all') && (
                  <div className={cn(
                    "flex items-center gap-1 pt-3 border-t",
                    isDark ? "border-zinc-900" : "border-zinc-200"
                  )}>
                    <Filter className={cn(
                      "h-3.5 w-3.5 mr-1",
                      isDark ? "text-zinc-600" : "text-zinc-400"
                    )} />
                    <button
                      onClick={() => setSelectedLevel('all')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                        selectedLevel === 'all'
                          ? isDark
                            ? "bg-zinc-800 text-white"
                            : "bg-zinc-200 text-zinc-900"
                          : isDark
                            ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                      )}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setSelectedLevel('info')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        selectedLevel === 'info'
                          ? "bg-blue-500/20 text-blue-400"
                          : isDark
                            ? "text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10"
                            : "text-zinc-600 hover:text-blue-600 hover:bg-blue-50"
                      )}
                    >
                      <Info className="h-3 w-3" />
                      Info
                    </button>
                    <button
                      onClick={() => setSelectedLevel('success')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        selectedLevel === 'success'
                          ? "bg-green-500/20 text-green-400"
                          : isDark
                            ? "text-zinc-500 hover:text-green-400 hover:bg-green-500/10"
                            : "text-zinc-600 hover:text-green-600 hover:bg-green-50"
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Success
                    </button>
                    <button
                      onClick={() => setSelectedLevel('warning')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        selectedLevel === 'warning'
                          ? "bg-yellow-500/20 text-yellow-400"
                          : isDark
                            ? "text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                            : "text-zinc-600 hover:text-yellow-600 hover:bg-yellow-50"
                      )}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Warning
                    </button>
                    <button
                      onClick={() => setSelectedLevel('error')}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        selectedLevel === 'error'
                          ? "bg-red-500/20 text-red-400"
                          : isDark
                            ? "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                            : "text-zinc-600 hover:text-red-600 hover:bg-red-50"
                      )}
                    >
                      <XCircle className="h-3 w-3" />
                      Error
                    </button>
                  </div>
                )}
              </CardHeader>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-4 space-y-3">
                  {/* Renderizar baseado na aba selecionada */}
                  {logTab === 'execution' && (
                    <>
                      {logsLoading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 className={cn(
                        "w-6 h-6 animate-spin",
                        isDark ? "text-white/50" : "text-zinc-500"
                      )} />
                      <p className={cn(
                        "text-sm",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>
                        Carregando logs...
                      </p>
                    </div>
                  ) : logsError ? (
                    <div className={cn(
                      "text-center py-8 text-sm",
                      isDark ? "text-red-400" : "text-red-600"
                    )}>
                      {logsError}
                    </div>
                  ) : logs.length > 0 ? (
                    <>
                      {logs.map((log, index: number) => {
                        const isError = log.level === 'error';
                        const isSuccess = log.level === 'success';
                        const isWarning = log.level === 'warning';

                        // Cor do indicador lateral baseado no nível
                        const levelColor = isError
                          ? 'bg-red-500'
                          : isWarning
                            ? 'bg-yellow-500'
                            : isSuccess
                              ? 'bg-green-500'
                              : 'bg-blue-500';

                        // Cor do texto baseado no nível
                        const textColor = isError
                          ? (isDark ? 'text-red-400' : 'text-red-600')
                          : isWarning
                            ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                            : isSuccess
                              ? (isDark ? 'text-green-400' : 'text-green-600')
                              : (isDark ? 'text-zinc-400' : 'text-zinc-700');

                        return (
                          <div
                            key={log.id}
                            className={cn(
                              "relative pl-3 py-2 rounded-lg transition-colors",
                              isDark
                                ? "hover:bg-zinc-900/50"
                                : "hover:bg-zinc-50"
                            )}
                          >
                            {/* Indicador lateral colorido */}
                            <div className={cn(
                              "absolute left-0 top-2 bottom-2 w-1 rounded-full",
                              levelColor
                            )} />

                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[11px] font-mono px-1.5 py-0.5 rounded",
                                    isDark ? "text-zinc-500 bg-zinc-900" : "text-zinc-500 bg-zinc-100"
                                  )}>
                                    {log.timestamp}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] px-2 h-5 font-medium uppercase",
                                      isError
                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                        : isWarning
                                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                          : isSuccess
                                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                                            : isDark
                                              ? "bg-zinc-900 text-zinc-500 border-zinc-800"
                                              : "bg-zinc-100 text-zinc-600 border-zinc-300"
                                    )}
                                  >
                                    {log.step_name}
                                  </Badge>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 h-4 font-medium uppercase",
                                    isError
                                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : isWarning
                                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                        : isSuccess
                                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  )}
                                >
                                  {log.level || 'info'}
                                </Badge>
                              </div>
                              <div className="flex items-start gap-2 pl-0.5">
                                <span className="text-sm">{log.icon}</span>
                                <p className={cn(
                                  "text-sm leading-relaxed flex-1",
                                  textColor
                                )}>
                                  {log.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Botão Carregar Mais */}
                      {hasMoreLogs && (
                        <div className="flex justify-center pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMoreLogs}
                            disabled={logsLoading}
                            className={cn(
                              "gap-2",
                              isDark
                                ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                                : "bg-white border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                            )}
                          >
                            {logsLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Carregando...
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Carregar mais logs
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {!hasMoreLogs && logs.length > 0 && (
                        <div className={cn(
                          "text-center py-4 text-xs",
                          isDark ? "text-zinc-600" : "text-zinc-500"
                        )}>
                          Todos os logs foram carregados
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={cn(
                      "text-center py-8 text-sm",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )}>
                      Nenhum log encontrado
                      {selectedLevel !== 'all' && ` para o nível "${selectedLevel}"`}.
                    </div>
                  )}
                    </>
                  )}

                  {/* Aba de Fila */}
                  {logTab === 'queue' && (
                    <>
                      {queueLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <Loader2 className={cn(
                            "w-6 h-6 animate-spin",
                            isDark ? "text-white/50" : "text-zinc-500"
                          )} />
                          <p className={cn(
                            "text-sm",
                            isDark ? "text-zinc-500" : "text-zinc-600"
                          )}>
                            Carregando fila...
                          </p>
                        </div>
                      ) : queueError ? (
                        <div className={cn(
                          "text-center py-8 text-sm",
                          isDark ? "text-red-400" : "text-red-600"
                        )}>
                          {queueError}
                        </div>
                      ) : (
                        <>
                          {/* Resumo da Fila */}
                          {queueSummary && (
                            <div className={cn(
                              "p-4 rounded-lg border mb-4",
                              isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                            )}>
                              <h4 className={cn(
                                "text-sm font-medium mb-3",
                                isDark ? "text-white" : "text-zinc-900"
                              )}>
                                Resumo da Fila
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Total:</span>
                                  <span className={cn("ml-2 font-medium", isDark ? "text-white" : "text-zinc-900")}>
                                    {queueSummary.total_messages}
                                  </span>
                                </div>
                                <div>
                                  <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Pendentes:</span>
                                  <span className={cn("ml-2 font-medium text-yellow-500")}>
                                    {queueSummary.pending_count}
                                  </span>
                                </div>
                                <div>
                                  <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Enviadas:</span>
                                  <span className={cn("ml-2 font-medium text-green-500")}>
                                    {queueSummary.sent_count}
                                  </span>
                                </div>
                                <div>
                                  <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Falhadas:</span>
                                  <span className={cn("ml-2 font-medium text-red-500")}>
                                    {queueSummary.failed_count}
                                  </span>
                                </div>
                              </div>
                              {queueSummary.next_lead_name && (
                                <div className={cn(
                                  "mt-3 pt-3 border-t text-xs",
                                  isDark ? "border-zinc-800" : "border-zinc-200"
                                )}>
                                  <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Próximo:</span>
                                  <span className={cn("ml-2 font-medium", isDark ? "text-white" : "text-zinc-900")}>
                                    {queueSummary.next_lead_name}
                                  </span>
                                  <span className={cn(
                                    "ml-2 font-medium",
                                    queueSummary.time_until_next?.startsWith('-')
                                      ? 'text-orange-500'
                                      : isDark ? 'text-emerald-400' : 'text-emerald-600'
                                  )}>
                                    {formatScheduledTime(queueSummary.next_scheduled_at, queueSummary.time_until_next)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Lista de Mensagens na Fila */}
                          {queueMessages.length > 0 ? (
                            <>
                              {queueMessages.map((msg, index) => (
                                <div key={msg.message_id} className="relative pl-6 mb-6">
                                  {index !== queueMessages.length - 1 && (
                                    <div className={cn(
                                      "absolute left-[5px] top-2 h-[calc(100%+1.5rem)] w-[1px]",
                                      isDark ? "bg-zinc-800" : "bg-zinc-300"
                                    )} />
                                  )}
                                  <div 
                                    className={cn(
                                      "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2",
                                      isDark ? 'bg-black border-yellow-500' : 'bg-white border-yellow-600'
                                    )}
                                  />
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={cn(
                                        "text-xs font-mono",
                                        isDark ? "text-zinc-500" : "text-zinc-600"
                                      )}>
                                        #{msg.position_in_queue}
                                      </span>
                                      <Badge 
                                        variant="secondary" 
                                        className={cn(
                                          "text-[10px] px-2 h-5 font-medium tracking-wide uppercase",
                                          isDark 
                                            ? "bg-zinc-900 text-zinc-500 border-zinc-800" 
                                            : "bg-zinc-100 text-zinc-600 border-zinc-300"
                                        )}
                                      >
                                        {msg.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Clock className="w-4 h-4 text-yellow-500 mt-0.5" />
                                      <div className="flex-1">
                                        <p className={cn(
                                          "text-sm font-medium",
                                          isDark ? 'text-white' : 'text-zinc-900'
                                        )}>
                                          {msg.lead_name}
                                        </p>
                                        <p className={cn(
                                          "text-xs",
                                          isDark ? 'text-zinc-500' : 'text-zinc-600'
                                        )}>
                                          {msg.phone_number}
                                        </p>
                                        <p className={cn(
                                          "text-xs mt-1 font-medium",
                                          msg.time_until_send?.startsWith('-')
                                            ? 'text-orange-500'
                                            : isDark ? 'text-emerald-400' : 'text-emerald-600'
                                        )}>
                                          {formatScheduledTime(msg.scheduled_at, msg.time_until_send)}
                                        </p>
                                        {msg.generated_message && (
                                          <p className={cn(
                                            "text-xs mt-2 p-2 rounded border",
                                            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                                          )}>
                                            {msg.generated_message.substring(0, 100)}{msg.generated_message.length > 100 ? '...' : ''}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className={cn(
                              "text-center py-8 text-sm",
                              isDark ? "text-zinc-600" : "text-zinc-500"
                            )}>
                              Nenhuma mensagem na fila
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Aba Todos */}
                  {logTab === 'all' && (
                    <>
                      {(queueLoading || logsLoading) ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <Loader2 className={cn(
                            "w-6 h-6 animate-spin",
                            isDark ? "text-white/50" : "text-zinc-500"
                          )} />
                        </div>
                      ) : (
                        <>
                          {/* Seção de Fila */}
                          {queueMessages.length > 0 && (
                            <div className="mb-8">
                              <h4 className={cn(
                                "text-sm font-medium mb-4 flex items-center gap-2",
                                isDark ? "text-zinc-400" : "text-zinc-700"
                              )}>
                                <Clock className="w-4 h-4" />
                                Fila de Mensagens ({queueMessages.length})
                              </h4>
                              {queueMessages.slice(0, 3).map((msg, index) => (
                                <div key={msg.message_id} className="relative pl-6 mb-6">
                                  {index !== 2 && (
                                    <div className={cn(
                                      "absolute left-[5px] top-2 h-[calc(100%+1.5rem)] w-[1px]",
                                      isDark ? "bg-zinc-800" : "bg-zinc-300"
                                    )} />
                                  )}
                                  <div 
                                    className={cn(
                                      "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2",
                                      isDark ? 'bg-black border-yellow-500' : 'bg-white border-yellow-600'
                                    )}
                                  />
                                  <div className="space-y-1">
                                    <p className={cn("text-sm font-medium", isDark ? 'text-white' : 'text-zinc-900')}>
                                      {msg.lead_name}
                                    </p>
                                    <p className={cn(
                                      "text-xs font-medium",
                                      msg.time_until_send?.startsWith('-')
                                        ? 'text-orange-500'
                                        : isDark ? 'text-emerald-400' : 'text-emerald-600'
                                    )}>
                                      {formatScheduledTime(msg.scheduled_at, msg.time_until_send)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {queueMessages.length > 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLogTab('queue')}
                                  className={cn(
                                    "w-full text-xs mb-4",
                                    isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-600 hover:text-zinc-900"
                                  )}
                                >
                                  Ver todas as {queueMessages.length} mensagens
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Seção de Logs */}
                          {logs.length > 0 && (
                            <div>
                              <h4 className={cn(
                                "text-sm font-medium mb-4 flex items-center gap-2",
                                isDark ? "text-zinc-400" : "text-zinc-700"
                              )}>
                                <Zap className="w-4 h-4" />
                                Logs de Execução (últimos 5)
                              </h4>
                              {logs.slice(0, 5).map((log, index) => (
                                <div key={log.id} className="relative pl-6 mb-6">
                                  {index !== 4 && logs.length > 1 && (
                                    <div className={cn(
                                      "absolute left-[5px] top-2 h-[calc(100%+1.5rem)] w-[1px]",
                                      isDark ? "bg-zinc-800" : "bg-zinc-300"
                                    )} />
                                  )}
                                  <div 
                                    className={cn(
                                      "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2",
                                      isDark ? 'bg-black' : 'bg-white'
                                    )}
                                    style={{ borderColor: getLogLevelColor(log.level) }}
                                  />
                                  <div className="space-y-1">
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm">{log.icon}</span>
                                      <p className={cn(
                                        "text-sm leading-relaxed flex-1",
                                        isDark ? 'text-zinc-400' : 'text-zinc-700'
                                      )}>
                                        {log.message}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLogTab('execution')}
                                className={cn(
                                  "w-full text-xs",
                                  isDark ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-600 hover:text-zinc-900"
                                )}
                              >
                                Ver todos os {logsTotal} logs
                              </Button>
                            </div>
                          )}

                          {/* Nenhum dado */}
                          {queueMessages.length === 0 && logs.length === 0 && (
                            <div className={cn(
                              "text-center py-8 text-sm",
                              isDark ? "text-zinc-600" : "text-zinc-500"
                            )}>
                              Nenhum log ou mensagem na fila
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}