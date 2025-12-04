import { useState, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
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
  Pause,
  X,
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
        <div className="relative flex items-center justify-center" style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
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

  const pauseCampaign = async () => {
    if (!analytics?.run.id) return;

    setIsActionLoading(true);

    try {
      const { error } = await supabase.rpc('pause_campaign_run', {
        p_run_id: analytics.run.id,
        p_reason: 'Pausado manualmente pelo usuário'
      });

      if (error) {
        toast.error('Erro ao pausar campanha');
        console.error('Erro ao pausar campanha:', error);
        return;
      }

      toast.success('Campanha pausada com sucesso');
      
      // Recarregar dados locais
      await loadRunDetails();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao pausar campanha:', err);
      toast.error('Erro ao pausar campanha');
    } finally {
      setIsActionLoading(false);
    }
  };

  const resumeCampaign = async () => {
    if (!analytics?.run.id) return;

    setIsActionLoading(true);

    try {
      const { data, error } = await supabase.rpc('resume_campaign_run', {
        p_run_id: analytics.run.id
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erro ao retomar campanha');
        console.error('Erro ao retomar campanha:', error);
        return;
      }

      toast.success(`Campanha retomada! ${data.messages_resumed || 0} mensagens reagendadas`);
      
      // Recarregar dados locais
      await loadRunDetails();
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao retomar campanha:', err);
      toast.error('Erro ao retomar campanha');
    } finally {
      setIsActionLoading(false);
    }
  };

  const cancelCampaign = async () => {
    if (!analytics?.run.id) return;

    setIsActionLoading(true);

    try {
      const { error } = await supabase.rpc('cancel_campaign_run', {
        p_run_id: analytics.run.id
      });

      if (error) {
        toast.error('Erro ao cancelar campanha');
        console.error('Erro ao cancelar campanha:', error);
        return;
      }

      toast.success('Campanha cancelada');
      
      // Recarregar dados locais
      await loadRunDetails();
      
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
          {/* Botões de controle de campanha */}
          {analytics.run.status === 'running' && (
            <Button 
              onClick={pauseCampaign}
              disabled={isActionLoading}
              size="sm"
              className={cn(
                "gap-2 border-0",
                isDark 
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" 
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              )}
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              Pausar
            </Button>
          )}

          {analytics.run.status === 'paused' && (
            <Button 
              onClick={resumeCampaign}
              disabled={isActionLoading}
              variant="outline"
              size="sm"
              className={cn(
                "gap-2",
                isDark 
                  ? "border-green-500/50 text-green-500 hover:bg-green-500/10" 
                  : "border-green-500 text-green-600 hover:bg-green-50"
              )}
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Retomar
            </Button>
          )}

          {['running', 'paused'].includes(analytics.run.status) && (
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
                    Logs da Execução
                  </CardTitle>
                  <Badge variant="outline" className={cn(
                    "font-normal",
                    isDark 
                      ? "bg-zinc-900 border-zinc-800 text-zinc-500" 
                      : "bg-zinc-100 border-zinc-300 text-zinc-600"
                  )}>
                    {logsTotal} logs
                  </Badge>
                </div>

                {/* Filtros de Nível */}
                <div className="flex gap-2">
                  {(['all', 'info', 'success', 'warning', 'error'] as LogLevelFilter[]).map((level) => (
                    <Button
                      key={level}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLevel(level)}
                      className={cn(
                        "h-7 text-xs capitalize transition-colors border-0",
                        selectedLevel === level
                          ? "bg-white text-black hover:bg-white/90" 
                          : isDark
                            ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                            : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                      )}
                    >
                      {level === 'all' ? (
                        <>
                          <Filter className="w-3 h-3 mr-1.5" />
                          Todos
                        </>
                      ) : level === 'info' ? 'Info' : level === 'success' ? 'Success' : level === 'warning' ? 'Warning' : 'Error'}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-6 space-y-6">
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
                        return (
                          <div key={log.id} className="relative pl-6">
                            {/* Line connecting dots */}
                            {index !== logs.length - 1 && (
                              <div className={cn(
                                "absolute left-[5px] top-2 h-[calc(100%+1.5rem)] w-[1px]",
                                isDark ? "bg-zinc-800" : "bg-zinc-300"
                              )} />
                            )}
                            
                            {/* Dot */}
                            <div 
                              className={cn(
                                "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2",
                                isDark ? 'bg-black' : 'bg-white'
                              )}
                              style={{ borderColor: getLogLevelColor(log.level) }}
                            />
                            
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn(
                                  "text-xs font-mono",
                                  isDark ? "text-zinc-500" : "text-zinc-600"
                                )}>
                                  {log.timestamp}
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
                                  {log.step_name}
                                </Badge>
                              </div>
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
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}