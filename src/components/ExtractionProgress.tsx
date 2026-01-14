import { useEffect, useState, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import {
  cancelExtractionRun,
  getExtractionAnalytics,
  getEnrichmentStatus
} from '../services/extraction-service';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowLeft,
  X,
  Clock,
  Zap,
  Search,
  MapPin,
  Sun,
  Moon,
  ArrowRight,
  MessageCircle,
  Globe,
  Building2,
  FileText,
  RefreshCw,
  Filter,
  ListFilter,
  Play,
  List,
  Info,
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ProfileMenu } from './ProfileMenu';
import { PieChart, Pie, BarChart, Bar, Cell, ResponsiveContainer, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { MoveLeadsModal } from './MoveLeadsModal';
import { CNPJLogCard } from './CNPJLogCard';

import { cn } from './ui/utils';

interface ExtractionProgressProps {
  theme: Theme;
  onThemeToggle: () => void;
  runId: string | null;
  onBack?: () => void;
  onNavigateToSettings?: () => void;
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
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className={cn(
      isDark 
        ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
        : "bg-white border border-zinc-200"
    )}>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className={cn(
            "text-xs font-medium",
            isDark ? "text-zinc-400" : "text-zinc-600"
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
      
      // Easing function for smooth animation
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
    // Small delay to ensure animation starts from 0
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

// Tipos para os logs
type LogTab = 'todos' | 'extracao' | 'enriquecimento' | 'scraping';
type LogLevel = 'all' | 'info' | 'success' | 'warning' | 'error';

export function ExtractionProgress({ theme, onThemeToggle, runId, onBack, onNavigateToSettings }: ExtractionProgressProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [moveLeadsModalOpen, setMoveLeadsModalOpen] = useState(false);

  // Estados para controle de logs
  const [logTab, setLogTab] = useState<LogTab>('todos');
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel>('all');

  const [enrichmentStatus, setEnrichmentStatus] = useState<{
    total: number;
    whatsapp: { total_com_telefone: number; verificados: number; validos: number; invalidos: number; pending: number; sem_telefone: number };
    whois: { total_br: number; enriched: number; pending: number; failed: number; internacional: number; sem_dominio: number };
    cnpj: { total_com_cnpj: number; enriched: number; pending: number; sem_cnpj: number };
    scraping: { total_com_site: number; pending: number; processing: number; completed: number; failed: number; sem_site: number };
    status_enrichment: { pending: number; enriching: number; completed: number };
  } | null>(null);
  
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
      toast.info('Workspace alterado. Redirecionando...');
      if (onBack) {
        onBack();
      }
    }
  }, [currentWorkspace?.id, onBack]);

  // Buscar dados iniciais
  useEffect(() => {
    if (!runId) return;
    fetchData();
  }, [runId]);

  // Realtime para atualizar progresso
  useEffect(() => {
    if (!runId || !analytics?.run) return;
    
    const status = analytics.run.status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') return;


    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lead_extraction_runs',
          filter: `id=eq.${runId}`
        },
        (payload) => {
          fetchData(); // Recarregar tudo
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, analytics?.run?.status]);

  // Polling de fallback (caso Realtime não funcione)
  // Continua enquanto extração está rodando OU enriquecimento não está completo
  useEffect(() => {
    if (!runId || !analytics?.run) return;

    const status = analytics.run.status;
    const extractionRunning = status !== 'completed' && status !== 'failed' && status !== 'cancelled';

    // Verificar se há algum enriquecimento ainda pendente em QUALQUER categoria
    const hasEnrichmentPending = enrichmentStatus && enrichmentStatus.total > 0 && (
      // WhatsApp pendente
      enrichmentStatus.whatsapp.pending > 0 ||
      // WHOIS pendente (só para domínios .br)
      enrichmentStatus.whois.pending > 0 ||
      // CNPJ pendente (só para leads com CNPJ)
      enrichmentStatus.cnpj.pending > 0 ||
      // Scraping pendente ou processando
      enrichmentStatus.scraping.pending > 0 ||
      enrichmentStatus.scraping.processing > 0 ||
      // Status geral não completo
      enrichmentStatus.status_enrichment.pending > 0 ||
      enrichmentStatus.status_enrichment.enriching > 0
    );

    // Continuar polling se extração está rodando OU se enriquecimento está pendente
    if (!extractionRunning && !hasEnrichmentPending) {
      return;
    }

    const pollInterval = extractionRunning ? 3000 : 5000; // 3s durante extração, 5s durante enriquecimento
    const pendingItems = [];
    if (enrichmentStatus?.whatsapp.pending > 0) pendingItems.push(`WhatsApp: ${enrichmentStatus.whatsapp.pending}`);
    if (enrichmentStatus?.whois.pending > 0) pendingItems.push(`WHOIS: ${enrichmentStatus.whois.pending}`);
    if (enrichmentStatus?.cnpj.pending > 0) pendingItems.push(`CNPJ: ${enrichmentStatus.cnpj.pending}`);
    if (enrichmentStatus?.scraping.pending > 0) pendingItems.push(`Scraping: ${enrichmentStatus.scraping.pending}`);
    if (enrichmentStatus?.scraping.processing > 0) pendingItems.push(`Scraping em andamento: ${enrichmentStatus.scraping.processing}`);


    const interval = setInterval(() => {
      fetchData();
    }, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [
    runId,
    analytics?.run?.status,
    enrichmentStatus?.whatsapp?.pending,
    enrichmentStatus?.whois?.pending,
    enrichmentStatus?.cnpj?.pending,
    enrichmentStatus?.scraping?.pending,
    enrichmentStatus?.scraping?.processing,
    enrichmentStatus?.status_enrichment?.pending,
    enrichmentStatus?.status_enrichment?.enriching
  ]);

  const fetchData = async () => {
    if (!runId) return;

    try {
      // Don't set loading to true on subsequent updates to avoid flashing
      if (!analytics) setLoading(true);

      const data = await getExtractionAnalytics({ runId });
      setAnalytics(data);


      // Buscar status de enriquecimento
      try {
        const enrichment = await getEnrichmentStatus(runId);
        setEnrichmentStatus(enrichment);
      } catch (enrichmentError) {
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados:', error);
      
      // Erro específico da função RPC
      if (error?.message?.includes('lead_stats') || error?.message?.includes('get_extraction_analytics') || error?.code === '42P01') {
        toast.error('Erro: Função RPC precisa ser corrigida no Supabase. Veja o console.', {
          duration: 8000
        });
        
        // Log visual detalhado no console
        
        
        
        
        
      } else {
        toast.error('Erro ao carregar progresso');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!runId || !analytics) return;

    try {
      setCancelling(true);
      await cancelExtractionRun(runId);
      toast.success('Extração cancelada');
      fetchData();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar extração');
    } finally {
      setCancelling(false);
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
      },
      partial: { 
        icon: AlertCircle, 
        text: 'Parcial', 
        variant: 'secondary' as const,
        color: 'text-yellow-500'
      }
    };

    return statusMap[analytics.run.status as keyof typeof statusMap] || statusMap.pending;
  };

  if (loading && !analytics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando detalhes da extração...</p>
        </div>
      </div>
    );
  }

  if (!analytics && !loading) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center space-y-4 p-8", isDark ? "bg-black text-white" : "bg-white")}>
        <XCircle className="w-12 h-12 text-destructive" />
        <div className="text-center max-w-2xl">
          <h2 className="text-xl font-semibold">Erro ao Carregar Analytics</h2>
          <p className={cn("text-sm mt-2", isDark ? "text-zinc-400" : "text-muted-foreground")}>
            A função RPC <code className="px-2 py-1 bg-zinc-900 rounded text-teal-400">get_extraction_analytics</code> não está configurada corretamente no Supabase.
          </p>
          
          <div className={cn("mt-6 p-4 rounded-lg border text-left text-sm space-y-3", isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <p className="font-semibold text-orange-500">⚠️ Problema Detectado:</p>
            <p className={isDark ? "text-zinc-300" : "text-zinc-700"}>
              A função está tentando acessar a tabela <code className="px-1.5 py-0.5 bg-red-950 text-red-400 rounded text-xs">lead_stats</code> que não existe.
            </p>
            
            <div className="pt-3 border-t border-zinc-800">
              <p className="font-semibold text-teal-400 mb-2">✅ Como Corrigir:</p>
              <ol className={cn("list-decimal list-inside space-y-1.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
                <li>Abra o arquivo <code className="px-1.5 py-0.5 bg-zinc-900 text-teal-400 rounded text-xs">/SUPABASE_RPC_FIX.md</code></li>
                <li>Acesse o <strong>SQL Editor</strong> no Supabase Dashboard</li>
                <li>Execute o SQL de correção fornecido</li>
                <li>Recarregue esta página</li>
              </ol>
            </div>
            
            <div className="pt-3 border-t border-zinc-800">
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-500")}>
                💡 <strong>Dica:</strong> Pressione <kbd className="px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">F12</kbd> e veja o Console para detalhes completos.
              </p>
            </div>
          </div>
        </div>
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className={cn("mt-4", isDark && "border-zinc-800 hover:bg-zinc-900")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>
    );
  }

  const runInfo = analytics.run;
  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig?.icon || Clock;

  // Detectar se é extração do Instagram (não tem filtros)
  const isInstagram = runInfo?.source === 'instagram';

  const containerClass = isDark ? "bg-black text-white" : "bg-white text-zinc-950";

  return (
    <div className={cn("h-screen w-full flex flex-col overflow-hidden", containerClass)}>
      {/* Header Section */}
      <div className={cn(
        "shrink-0 h-16 border-b flex items-center justify-between px-6 transition-colors",
        isDark 
          ? "bg-black border-white/[0.08]" 
          : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className={cn("h-8 w-8", isDark && "hover:bg-white/10 text-white")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Detalhes da Extração</h1>
            <div className={cn("h-4 w-px", isDark ? "bg-white/10" : "bg-zinc-200")} />
            <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-zinc-400" : "text-muted-foreground")}>
              <Search className="h-3.5 w-3.5" />
              <span className="font-medium">{runInfo.search_term}</span>
              <span className="opacity-50">•</span>
              <MapPin className="h-3.5 w-3.5" />
              <span>{runInfo.location}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {statusConfig && (
              <Badge 
                variant={statusConfig.variant === 'default' && runInfo.status === 'completed' ? 'default' : 'secondary'} 
                className={cn(
                  "px-3 py-1 text-sm font-medium gap-1.5", 
                  isDark && statusConfig.variant === 'secondary' && "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.text}
              </Badge>
            )}
            
            {runInfo.status === 'running' && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleCancel}
                disabled={cancelling}
                className="gap-2"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Cancelar
              </Button>
            )}
            
            {(runInfo.status === 'completed' && runInfo.created_quantity > 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMoveLeadsModalOpen(true)}
                className={cn(
                  "gap-2",
                  isDark && "border-zinc-800 hover:bg-zinc-900"
                )}
              >
                <ArrowRight className="h-4 w-4" />
                Mover Leads
              </Button>
            )}
          </div>

          <div className={cn("h-6 w-px", isDark ? "bg-white/10" : "bg-zinc-200")} />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onThemeToggle}
              className={cn("h-9 w-9", isDark ? "hover:bg-white/10 text-white/70 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900")}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* Left Column - Main Stats */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">
            {/* Cards Principais - Progresso, Duplicados e Filtrados */}
            <div className={cn(
              "grid gap-4",
              isInstagram
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-3"
            )}>
              {/* Progress Card */}
              <Card
                className={cn(
                  "rounded-xl",
                  isDark
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0"
                    : "bg-white border border-zinc-200"
                )}
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
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className={cn(
                          "text-4xl font-bold tracking-tight",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={runInfo.created_quantity || 0} />
                        </p>
                        <p className={cn(
                          "text-sm",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>
                          de {runInfo.target_quantity || 0} leads capturados
                        </p>
                      </div>
                      <div className="text-right mb-2">
                        <p className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-zinc-700" : "text-zinc-300"
                        )}>
                          <AnimatedCounter value={
                            runInfo.created_quantity && runInfo.target_quantity && runInfo.target_quantity > 0
                              ? Math.round((runInfo.created_quantity / runInfo.target_quantity) * 100)
                              : 0
                          } />%
                        </p>
                      </div>
                    </div>
                    <AnimatedProgressBar
                      percentage={
                        runInfo.created_quantity && runInfo.target_quantity && runInfo.target_quantity > 0
                          ? Math.min(Math.round((runInfo.created_quantity / runInfo.target_quantity) * 100), 100)
                          : 0
                      }
                      isDark={isDark}
                    />
                    <div className={cn(
                      "flex justify-between text-xs font-mono",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )}>
                      <span>Início: {new Date(runInfo.started_at || runInfo.created_at).toLocaleString('pt-BR')}</span>
                      {runInfo.duration_formatted && <span>Duração: {runInfo.duration_formatted}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duplicados Removidos */}
              <Card className={cn(
                isDark
                  ? "bg-gradient-to-br from-orange-950/20 via-zinc-950 to-black border border-orange-900/30"
                  : "bg-white border border-zinc-200"
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-base font-semibold uppercase",
                          isDark ? "text-orange-400" : "text-orange-600"
                        )}>Duplicados Removidos</span>
                      </div>
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>Leads que já existiam na base</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className={cn(
                      "text-4xl font-bold",
                      isDark ? "text-orange-500" : "text-orange-600"
                    )}>
                      <AnimatedCounter value={analytics.run?.duplicates_skipped || 0} />
                    </span>
                    <div className={cn(
                      "text-sm",
                      isDark ? "text-zinc-500" : "text-zinc-700"
                    )}>
                      <div>de {(analytics.run?.found_quantity || 0)} encontrados</div>
                      <div className="text-xs">
                        {analytics.run?.found_quantity ?
                          `${Math.round((analytics.run.duplicates_skipped / analytics.run.found_quantity) * 100)}% duplicados`
                          : '0%'}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "h-2 rounded-full overflow-hidden",
                    isDark ? "bg-zinc-900" : "bg-orange-200"
                  )}>
                    <div
                      className="h-full bg-orange-500 transition-all duration-1000"
                      style={{
                        width: analytics.run?.found_quantity ?
                          `${Math.round((analytics.run.duplicates_skipped / analytics.run.found_quantity) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Filtrados - Oculto para Instagram (não tem filtros) */}
              {!isInstagram && (
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-red-950/20 via-zinc-950 to-black border border-red-900/30"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            "text-base font-semibold uppercase",
                            isDark ? "text-red-400" : "text-red-600"
                          )}>Rejeitados por Filtros</span>
                        </div>
                        <p className={cn(
                          "text-xs",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>Leads que não passaram nos critérios</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className={cn(
                        "text-5xl font-bold",
                        isDark ? "text-red-500" : "text-red-600"
                      )}>
                        <AnimatedCounter value={analytics.run?.filtered_out || 0} />
                      </span>
                      <div className={cn(
                        "text-sm",
                        isDark ? "text-zinc-500" : "text-zinc-700"
                      )}>
                        <div>de {(analytics.run?.found_quantity || 0)} encontrados</div>
                        <div className="text-xs">
                          {analytics.run?.found_quantity ?
                            `${Math.round((analytics.run.filtered_out / analytics.run.found_quantity) * 100)}% rejeitados`
                            : '0%'}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "h-2 rounded-full overflow-hidden",
                      isDark ? "bg-zinc-900" : "bg-red-200"
                    )}>
                      <div
                        className="h-full bg-red-500 transition-all duration-1000"
                        style={{
                          width: analytics.run?.found_quantity ?
                            `${Math.round((analytics.run.filtered_out / analytics.run.found_quantity) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Seção: Dados de Contato */}
            <div className="space-y-4">
              <h3 className={cn(
                "text-base font-semibold uppercase tracking-wider",
                isDark ? "text-zinc-400" : "text-zinc-700"
              )}>
                Dados de Contato
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* ========== PRIMEIRA LINHA ========== */}
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
                        <AnimatedCounter value={analytics.contatos?.telefone?.com || 0} />
                      </span>
                    </div>
                    <MiniProgressBar percentage={analytics.contatos?.telefone?.percentual || 0} isDark={isDark} />
                  </div>
                </CardContent>
              </Card>

              {/* Telefone Fixo - Oculto para Instagram */}
              {!isInstagram && (
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
                      <span className="text-xs font-medium uppercase">Telefone Fixo</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.contatos?.tipo_telefone?.fixo || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.contatos?.tipo_telefone?.fixo && analytics.contatos?.telefone?.com ? Math.round((analytics.contatos.tipo_telefone.fixo / analytics.contatos.telefone.com) * 100) : 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* WhatsApp Pendente */}
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
                    <span className="text-xs font-medium uppercase">WhatsApp Válido</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-green-500" : "text-green-600"
                      )}>
                        <AnimatedCounter value={analytics.contatos?.whatsapp?.valido || 0} />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ========== SEGUNDA LINHA: WEBSITES ========== */}
              {/* Com Website */}
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
                    <span className="text-xs font-medium uppercase">Com Website</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        <AnimatedCounter value={analytics.contatos?.website?.com || 0} />
                      </span>
                    </div>
                    <MiniProgressBar percentage={analytics.contatos?.website?.percentual || 0} isDark={isDark} />
                  </div>
                </CardContent>
              </Card>

              {/* Sites Internacionais - Oculto para Instagram */}
              {!isInstagram && (
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
                      <span className="text-xs font-medium uppercase">Sites Internacionais</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.contatos?.website?.internacional || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.contatos?.website?.internacional && analytics.contatos?.website?.com ? Math.round((analytics.contatos.website.internacional / analytics.contatos.website.com) * 100) : 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sites .br - Oculto para Instagram */}
              {!isInstagram && (
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
                      <span className="text-xs font-medium uppercase">Sites .br</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.contatos?.website?.brasileiro || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.contatos?.website?.brasileiro && analytics.contatos?.website?.com ? Math.round((analytics.contatos.website.brasileiro / analytics.contatos.website.com) * 100) : 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ========== GRUPO EMAIL ========== */}
              {/* Email */}
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
                    <span className="text-xs font-medium uppercase">Com Email</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        <AnimatedCounter value={analytics.contatos?.email?.com || 0} />
                      </span>
                    </div>
                    <MiniProgressBar percentage={analytics.contatos?.email?.percentual || 0} isDark={isDark} />
                  </div>
                </CardContent>
              </Card>

              {/* ========== GRUPO CNPJ ========== */}
              {/* CNPJ - Oculto para Instagram */}
              {!isInstagram && (
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
                      <span className="text-xs font-medium uppercase">Com CNPJ</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.contatos?.cnpj?.com || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.contatos?.cnpj?.percentual || 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ========== GRUPO LOCALIZAÇÃO ========== */}
              {/* Com Endereço - Oculto para Instagram */}
              {!isInstagram && (
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
                      <span className="text-xs font-medium uppercase">Com Endereço</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          <AnimatedCounter value={analytics.contatos?.localizacao?.com_endereco || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.contatos?.localizacao?.com_endereco && analytics.contatos?.total ? Math.round((analytics.contatos.localizacao.com_endereco / analytics.contatos.total) * 100) : 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ========== CARDS ESPECÍFICOS INSTAGRAM ========== */}
              {/* Perfis Empresariais - Apenas para Instagram */}
              {isInstagram && (
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-purple-950/20 via-zinc-950 to-black border border-purple-900/30"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-purple-400" : "text-purple-600"
                    )}>
                      <Building2 className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Perfis Empresariais</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-purple-400" : "text-purple-600"
                        )}>
                          <AnimatedCounter value={analytics.perfis?.tipos?.empresas || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.perfis?.tipos?.empresas && analytics.perfis?.total ? Math.round((analytics.perfis.tipos.empresas / analytics.perfis.total) * 100) : 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Perfis Verificados - Apenas para Instagram */}
              {isInstagram && (
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-blue-950/20 via-zinc-950 to-black border border-blue-900/30"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-blue-400" : "text-blue-600"
                    )}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Verificados</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-3xl font-bold",
                          isDark ? "text-blue-400" : "text-blue-600"
                        )}>
                          <AnimatedCounter value={analytics.perfis?.tipos?.verificados || 0} />
                        </span>
                      </div>
                      <MiniProgressBar percentage={analytics.perfis?.tipos?.verificados && analytics.perfis?.total ? Math.round((analytics.perfis.tipos.verificados / analytics.perfis.total) * 100) : 0} isDark={isDark} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Média de Seguidores - Apenas para Instagram */}
              {isInstagram && (
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-pink-950/20 via-zinc-950 to-black border border-pink-900/30"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-pink-400" : "text-pink-600"
                    )}>
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Média de Seguidores</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-pink-400" : "text-pink-600"
                      )}>
                        {analytics.perfis?.seguidores?.media?.toLocaleString('pt-BR') || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mínimo de Seguidores - Apenas para Instagram */}
              {isInstagram && (
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-cyan-950/20 via-zinc-950 to-black border border-cyan-900/30"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-cyan-400" : "text-cyan-600"
                    )}>
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Mínimo de Seguidores</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-cyan-400" : "text-cyan-600"
                      )}>
                        {analytics.perfis?.seguidores?.minimo?.toLocaleString('pt-BR') || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Máximo de Seguidores - Apenas para Instagram */}
              {isInstagram && (
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-amber-950/20 via-zinc-950 to-black border border-amber-900/30"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className={cn(
                      "flex items-center gap-2 mb-3",
                      isDark ? "text-amber-400" : "text-amber-600"
                    )}>
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase">Máximo de Seguidores</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-amber-400" : "text-amber-600"
                      )}>
                        {analytics.perfis?.seguidores?.maximo?.toLocaleString('pt-BR') || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
            </div>

            {/* Seção: Progresso do Enriquecimento */}
            {enrichmentStatus && enrichmentStatus.total > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={cn(
                    "text-base font-semibold uppercase tracking-wider",
                    isDark ? "text-zinc-400" : "text-zinc-700"
                  )}>
                    Progresso do Enriquecimento
                  </h3>
                  {/* Status geral */}
                  <Badge
                    variant={
                      enrichmentStatus.status_enrichment.completed === enrichmentStatus.total
                        ? "default"
                        : enrichmentStatus.status_enrichment.enriching > 0
                        ? "secondary"
                        : "outline"
                    }
                    className={cn(
                      enrichmentStatus.status_enrichment.completed === enrichmentStatus.total
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : enrichmentStatus.status_enrichment.enriching > 0
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    )}
                  >
                    {enrichmentStatus.status_enrichment.completed === enrichmentStatus.total ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Concluído
                      </>
                    ) : enrichmentStatus.status_enrichment.enriching > 0 ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Processando
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Aguardando
                      </>
                    )}
                  </Badge>
                </div>

                {/* Barra de progresso geral */}
                <Card className={cn(
                  isDark
                    ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50"
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-600")}>
                        {enrichmentStatus.status_enrichment.completed} de {enrichmentStatus.total} leads enriquecidos
                      </span>
                      <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-zinc-900")}>
                        {enrichmentStatus.total > 0 ? Math.round((enrichmentStatus.status_enrichment.completed / enrichmentStatus.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className={cn(
                      "h-2 rounded-full overflow-hidden",
                      isDark ? "bg-zinc-800" : "bg-zinc-200"
                    )}>
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                        style={{
                          width: `${enrichmentStatus.total > 0 ? Math.round((enrichmentStatus.status_enrichment.completed / enrichmentStatus.total) * 100) : 0}%`
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Cards de cada tipo de enriquecimento */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* WhatsApp */}
                  <Card className={cn(
                    isDark
                      ? "bg-gradient-to-br from-green-950/20 via-zinc-950 to-black border border-green-900/30"
                      : "bg-white border border-zinc-200"
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className={cn("w-4 h-4", isDark ? "text-green-400" : "text-green-600")} />
                        <span className={cn("text-xs font-medium uppercase", isDark ? "text-green-400" : "text-green-600")}>
                          WhatsApp
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Com Telefone</span>
                          <span className={isDark ? "text-white" : "text-zinc-900"}>{enrichmentStatus.whatsapp.total_com_telefone}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Verificados</span>
                          <span className={isDark ? "text-white" : "text-zinc-900"}>{enrichmentStatus.whatsapp.verificados}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Válidos</span>
                          <span className={cn("font-medium", isDark ? "text-green-400" : "text-green-600")}>{enrichmentStatus.whatsapp.validos}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Inválidos</span>
                          <span className={isDark ? "text-red-400" : "text-red-600"}>{enrichmentStatus.whatsapp.invalidos}</span>
                        </div>
                        {enrichmentStatus.whatsapp.pending > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Pendentes</span>
                            <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>{enrichmentStatus.whatsapp.pending}</span>
                          </div>
                        )}
                      </div>
                      <div className={cn("h-1 rounded-full overflow-hidden mt-2", isDark ? "bg-zinc-800" : "bg-zinc-200")}>
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${enrichmentStatus.whatsapp.total_com_telefone > 0 ? Math.round((enrichmentStatus.whatsapp.verificados / enrichmentStatus.whatsapp.total_com_telefone) * 100) : 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* WHOIS */}
                  <Card className={cn(
                    isDark
                      ? "bg-gradient-to-br from-blue-950/20 via-zinc-950 to-black border border-blue-900/30"
                      : "bg-white border border-zinc-200"
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className={cn("w-4 h-4", isDark ? "text-blue-400" : "text-blue-600")} />
                        <span className={cn("text-xs font-medium uppercase", isDark ? "text-blue-400" : "text-blue-600")}>
                          WHOIS (.br)
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Total .br</span>
                          <span className={isDark ? "text-white" : "text-zinc-900"}>{enrichmentStatus.whois.total_br}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Enriquecidos</span>
                          <span className={cn("font-medium", isDark ? "text-blue-400" : "text-blue-600")}>{enrichmentStatus.whois.enriched}</span>
                        </div>
                        {enrichmentStatus.whois.pending > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Pendentes</span>
                            <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>{enrichmentStatus.whois.pending}</span>
                          </div>
                        )}
                        {enrichmentStatus.whois.failed > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Falhas</span>
                            <span className={isDark ? "text-red-400" : "text-red-600"}>{enrichmentStatus.whois.failed}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Internacionais</span>
                          <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>{enrichmentStatus.whois.internacional}</span>
                        </div>
                      </div>
                      <div className={cn("h-1 rounded-full overflow-hidden mt-2", isDark ? "bg-zinc-800" : "bg-zinc-200")}>
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${enrichmentStatus.whois.total_br > 0 ? Math.round((enrichmentStatus.whois.enriched / enrichmentStatus.whois.total_br) * 100) : 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* CNPJ */}
                  <Card className={cn(
                    isDark
                      ? "bg-gradient-to-br from-purple-950/20 via-zinc-950 to-black border border-purple-900/30"
                      : "bg-white border border-zinc-200"
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-600")} />
                        <span className={cn("text-xs font-medium uppercase", isDark ? "text-purple-400" : "text-purple-600")}>
                          CNPJ
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Com CNPJ</span>
                          <span className={isDark ? "text-white" : "text-zinc-900"}>{enrichmentStatus.cnpj.total_com_cnpj}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Enriquecidos</span>
                          <span className={cn("font-medium", isDark ? "text-purple-400" : "text-purple-600")}>{enrichmentStatus.cnpj.enriched}</span>
                        </div>
                        {enrichmentStatus.cnpj.pending > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Pendentes</span>
                            <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>{enrichmentStatus.cnpj.pending}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Sem CNPJ</span>
                          <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>{enrichmentStatus.cnpj.sem_cnpj}</span>
                        </div>
                      </div>
                      <div className={cn("h-1 rounded-full overflow-hidden mt-2", isDark ? "bg-zinc-800" : "bg-zinc-200")}>
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${enrichmentStatus.cnpj.total_com_cnpj > 0 ? Math.round((enrichmentStatus.cnpj.enriched / enrichmentStatus.cnpj.total_com_cnpj) * 100) : 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scraping */}
                  <Card className={cn(
                    isDark
                      ? "bg-gradient-to-br from-cyan-950/20 via-zinc-950 to-black border border-cyan-900/30"
                      : "bg-white border border-zinc-200"
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        <span className={cn("text-xs font-medium uppercase", isDark ? "text-cyan-400" : "text-cyan-600")}>
                          Scraping
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Com Site</span>
                          <span className={isDark ? "text-white" : "text-zinc-900"}>{enrichmentStatus.scraping.total_com_site}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Concluídos</span>
                          <span className={cn("font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>{enrichmentStatus.scraping.completed}</span>
                        </div>
                        {enrichmentStatus.scraping.processing > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Processando</span>
                            <span className={isDark ? "text-blue-400" : "text-blue-600"}>{enrichmentStatus.scraping.processing}</span>
                          </div>
                        )}
                        {enrichmentStatus.scraping.pending > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Pendentes</span>
                            <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>{enrichmentStatus.scraping.pending}</span>
                          </div>
                        )}
                        {enrichmentStatus.scraping.failed > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className={isDark ? "text-zinc-500" : "text-zinc-600"}>Falhas</span>
                            <span className={isDark ? "text-red-400" : "text-red-600"}>{enrichmentStatus.scraping.failed}</span>
                          </div>
                        )}
                      </div>
                      <div className={cn("h-1 rounded-full overflow-hidden mt-2", isDark ? "bg-zinc-800" : "bg-zinc-200")}>
                        <div
                          className="h-full bg-cyan-500 transition-all duration-500"
                          style={{ width: `${enrichmentStatus.scraping.total_com_site > 0 ? Math.round((enrichmentStatus.scraping.completed / enrichmentStatus.scraping.total_com_site) * 100) : 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Seção: Gráficos de Distribuição */}
            {analytics.graficos && (
              <div className="space-y-4">
                <h3 className={cn(
                  "text-base font-semibold uppercase tracking-wider",
                  isDark ? "text-zinc-400" : "text-zinc-700"
                )}>
                  Gráficos de Distribuição
                </h3>

                {/* Grid de Gráficos de Pizza - 3 colunas para Instagram, 2 para outros */}
                <div className={cn(
                  "grid gap-4",
                  isInstagram
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
                )}>

                  {/* Pizza: Contatos */}
                  {analytics.graficos.pizza_contatos && analytics.graficos.pizza_contatos.length > 0 && (
                    <DonutChart
                      data={analytics.graficos.pizza_contatos}
                      title="Contatos"
                      colors={['#14b8a6', '#f97316', '#a855f7', '#22c55e']}
                      category="Contatos"
                      isDark={isDark}
                    />
                  )}

                  {/* Pizza: WhatsApp */}
                  {analytics.graficos.pizza_whatsapp && analytics.graficos.pizza_whatsapp.length > 0 && (
                    <DonutChart
                      data={analytics.graficos.pizza_whatsapp}
                      title="WhatsApp"
                      colors={['#22c55e', '#ef4444', '#52525b']}
                      category="WhatsApp"
                      isDark={isDark}
                    />
                  )}

                  {/* Pizza: Website */}
                  {analytics.graficos.pizza_website && analytics.graficos.pizza_website.length > 0 && (
                    <DonutChart
                      data={analytics.graficos.pizza_website}
                      title="Websites"
                      colors={['#22c55e', '#3b82f6', '#52525b']}
                      category="Websites"
                      isDark={isDark}
                    />
                  )}

                  {/* Pizza: Qualidade - Oculto para Instagram */}
                  {!isInstagram && analytics.graficos.pizza_qualidade && analytics.graficos.pizza_qualidade.length > 0 && (
                    <DonutChart
                      data={analytics.graficos.pizza_qualidade}
                      title="Qualidade"
                      colors={['#22c55e', '#84cc16', '#facc15', '#f97316', '#ef4444']}
                      category="Qualidade"
                      isDark={isDark}
                    />
                  )}

                </div>
              </div>
            )}

            {/* Seção Qualidade e Enriquecimento */}
            <div className="space-y-4">
              {/* Score de Qualidade - Oculto para Instagram */}
              {analytics.qualidade && !isInstagram && (
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={cn(
                        "text-lg font-semibold",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>Score de Qualidade</h3>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={cn(
                            "text-lg",
                            i < (analytics.qualidade?.estrelas || 0) 
                              ? 'text-yellow-500' 
                              : isDark ? 'text-zinc-700' : 'text-zinc-300'
                          )}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className={cn(
                          "text-sm mb-1",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>Classificação</div>
                        <div className={cn(
                          "text-xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>{analytics.qualidade?.classificacao || '-'}</div>
                      </div>
                      <div>
                        <div className={cn(
                          "text-sm mb-1",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>Score Médio</div>
                        <div className={cn(
                          "text-xl font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>{analytics.qualidade?.score_medio || 0}%</div>
                      </div>
                      <div>
                        <div className={cn(
                          "text-sm mb-1",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>Excelente</div>
                        <div className={cn(
                          "text-xl font-bold",
                          isDark ? "text-green-500" : "text-green-600"
                        )}>
                          <AnimatedCounter value={analytics.qualidade?.distribuicao?.excelente || 0} />
                        </div>
                      </div>
                      <div>
                        <div className={cn(
                          "text-sm mb-1",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>Alta</div>
                        <div className={cn(
                          "text-xl font-bold",
                          isDark ? "text-lime-500" : "text-lime-600"
                        )}>
                          <AnimatedCounter value={analytics.qualidade?.distribuicao?.alta || 0} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>

          {/* Right Column - Timeline with Tabs and Filters */}
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
              {/* Header com título e contador */}
              <CardHeader className={cn(
                "pb-3 shrink-0 border-b",
                isDark ? "border-zinc-900" : "border-zinc-200"
              )}>
                <div className="flex items-center justify-between">
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
                    {(() => {
                      // Filtrar timeline baseado na aba e nível selecionados
                      const timeline = analytics.timeline || [];
                      const enrichmentLogs = analytics.enrichment_timeline || [];

                      // Steps do Google Maps (extração)
                      const googleMapsSteps = ['google maps', 'inicialização', 'finalização', 'segmentação', 'compensação', 'compensação filtros', 'correção automática'];
                      // Steps do Instagram Discovery (extração)
                      const instagramDiscoverySteps = ['queries', 'serper query', 'loop complete', 'conclusão', 'ai expansion'];
                      // ✅ Steps do CNPJ (extração)
                      const cnpjSteps = ['cnpj_api_call', 'staging_insert', 'migrate_batch', 'complete', 'start'];
                      // Steps de enriquecimento (Instagram)
                      const enrichmentSteps = ['api call', 'run succeeded', 'processamento', 'auto-trigger', 'batch'];

                      // Combinar todos os steps de extração
                      const allExtractionSteps = [...googleMapsSteps, ...instagramDiscoverySteps, ...cnpjSteps];

                      // Se for aba de enriquecimento, combina enrichment_timeline + logs de enriquecimento da timeline
                      if (logTab === 'enriquecimento') {
                        // Logs da enrichment_timeline (Google Maps)
                        const fromEnrichmentTimeline = enrichmentLogs.filter((event: any) => {
                          if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                          return true;
                        });
                        // Logs de enriquecimento da timeline principal (Instagram)
                        const fromMainTimeline = timeline.filter((event: any) => {
                          const stepLower = (event.step || '').toLowerCase();
                          const isEnrichment = enrichmentSteps.some(s => stepLower.includes(s.toLowerCase()));
                          if (!isEnrichment) return false;
                          if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                          return true;
                        });
                        return fromEnrichmentTimeline.length + fromMainTimeline.length;
                      }
                      
                      // ✅ MELHORIA: Incluir logs CNPJ na aba de extração
                      if (logTab === 'extracao') {
                        const filtered = timeline.filter((event: any) => {
                          if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                          
                          // Steps do Google Maps
                          const googleMapsSteps = ['google maps', 'inicialização', 'finalização', 'segmentação', 'compensação', 'compensação filtros', 'correção automática'];
                          // Steps do Instagram Discovery
                          const instagramSteps = ['queries', 'serper query', 'loop complete', 'conclusão', 'ai expansion'];
                          // ✅ Adicionar steps CNPJ
                          const cnpjSteps = ['cnpj_api_call', 'staging_insert', 'migrate_batch', 'complete', 'start'];
                          
                          // Combinar todos os steps de extração
                          const allExtractionSteps = [...googleMapsSteps, ...instagramSteps, ...cnpjSteps];
                          const stepLower = (event.step || '').toLowerCase();
                          const isExtracao = allExtractionSteps.some(s => stepLower.includes(s.toLowerCase()));
                          
                          // ✅ Incluir logs CNPJ por source
                          const isCNPJSource = event.source === 'cnpj';
                          
                          return isExtracao || isCNPJSource;
                        });
                        return filtered.length;
                      }
                      
                      // Se for aba de scraping, busca logs de scraping por phase OU step_name
                      if (logTab === 'scraping') {
                        const filtered = timeline.filter((event: any) => {
                          if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                          
                          // Buscar logs de scraping por phase OU step_name
                          const isScrapingPhase = event.phase === 'scraping';
                          const isScrapingStep = event.step_name && (
                            event.step_name.toLowerCase().includes('website scraping') ||
                            event.step_name.toLowerCase().includes('scraping profiles') ||
                            event.step_name.toLowerCase().includes('scrape website') ||
                            event.step_name.toLowerCase().includes('scraping')
                          );
                          const isEnrichmentWithScraping = event.phase === 'enrichment' && isScrapingStep;
                          
                          // ✅ MELHORIA: Incluir logs específicos do CNPJ
                          const isCNPJLog = event.step_name && (
                            event.step_name.toLowerCase().includes('migrate_batch') ||
                            event.step_name.toLowerCase().includes('staging_insert') ||
                            event.step_name.toLowerCase().includes('cnpj_api_call') ||
                            event.step_name.toLowerCase().includes('complete') ||
                            event.source === 'cnpj'
                          );
                          
                          return isScrapingPhase || isEnrichmentWithScraping || isCNPJLog;
                        });
                        return filtered.length;
                      }

                      const filtered = timeline.filter((event: any) => {
                        // Filtro por aba
                        const stepLower = (event.step || '').toLowerCase();
                        if (logTab === 'extracao') {
                          const isExtracao = allExtractionSteps.some(s => stepLower.includes(s.toLowerCase()));
                          if (!isExtracao) return false;
                        }
                        // Filtro por nível
                        if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                        return true;
                      });
                      return filtered.length;
                    })()} logs
                  </Badge>
                </div>
              </CardHeader>

              {/* Abas de navegação */}
              <div className={cn(
                "flex items-center gap-1 px-4 py-2 border-b shrink-0",
                isDark ? "border-zinc-900 bg-zinc-950/50" : "border-zinc-200 bg-zinc-50"
              )}>
                <button
                  onClick={() => setLogTab('todos')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    logTab === 'todos'
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
                  onClick={() => setLogTab('extracao')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    logTab === 'extracao'
                      ? isDark
                        ? "bg-zinc-800 text-white"
                        : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                      : isDark
                        ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                >
                  Extração
                </button>
                <button
                  onClick={() => setLogTab('enriquecimento')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    logTab === 'enriquecimento'
                      ? isDark
                        ? "bg-zinc-800 text-white"
                        : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                      : isDark
                        ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                >
                  Enriquecimento
                </button>
                <button
                  onClick={() => setLogTab('scraping')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    logTab === 'scraping'
                      ? isDark
                        ? "bg-zinc-800 text-white"
                        : "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                      : isDark
                        ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  )}
                >
                  Scraping
                </button>
              </div>

              {/* Filtros por nível */}
              <div className={cn(
                "flex items-center gap-1 px-4 py-2 border-b shrink-0",
                isDark ? "border-zinc-900" : "border-zinc-200"
              )}>
                <Filter className={cn(
                  "h-3.5 w-3.5 mr-1",
                  isDark ? "text-zinc-600" : "text-zinc-400"
                )} />
                <button
                  onClick={() => setLogLevelFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                    logLevelFilter === 'all'
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
                  onClick={() => setLogLevelFilter('info')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                    logLevelFilter === 'info'
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
                  onClick={() => setLogLevelFilter('success')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                    logLevelFilter === 'success'
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
                  onClick={() => setLogLevelFilter('warning')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                    logLevelFilter === 'warning'
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
                  onClick={() => setLogLevelFilter('error')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                    logLevelFilter === 'error'
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

              {/* Lista de logs */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-4 space-y-3">
                  {(() => {
                    // Filtrar timeline baseado na aba e nível selecionados
                    const timeline = analytics.timeline || [];
                    const enrichmentLogs = analytics.enrichment_timeline || [];

                    // Steps de enriquecimento (Instagram)
                    const enrichmentSteps = ['api call', 'run succeeded', 'processamento', 'auto-trigger', 'batch'];

                    // Se for aba de enriquecimento
                    if (logTab === 'enriquecimento') {
                      // Combinar logs da enrichment_timeline (Google Maps) + logs de enriquecimento da timeline (Instagram)
                      const fromEnrichmentTimeline = enrichmentLogs.filter((event: any) => {
                        if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                        return true;
                      });
                      const fromMainTimeline = timeline.filter((event: any) => {
                        const stepLower = (event.step || '').toLowerCase();
                        const isEnrichment = enrichmentSteps.some(s => stepLower.includes(s.toLowerCase()));
                        if (!isEnrichment) return false;
                        if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                        return true;
                      });
                      const filteredEnrichment = [...fromEnrichmentTimeline, ...fromMainTimeline];

                      if (filteredEnrichment.length === 0) {
                        // Mostrar status do enriquecimento quando não há logs
                        return (
                          <div className={cn(
                            "text-center py-6",
                            isDark ? "text-zinc-500" : "text-zinc-600"
                          )}>
                            <div className="space-y-4">
                              <div className={cn(
                                "mx-auto w-12 h-12 rounded-full flex items-center justify-center",
                                isDark ? "bg-zinc-900" : "bg-zinc-100"
                              )}>
                                <RefreshCw className={cn(
                                  "h-6 w-6",
                                  isDark ? "text-zinc-600" : "text-zinc-400"
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  Enriquecimento em andamento
                                </p>
                                <p className="text-xs opacity-70">
                                  Os logs de enriquecimento serão exibidos aqui conforme os processos de WhatsApp, WHOIS, CNPJ e Scraping são executados.
                                </p>
                              </div>
                              {enrichmentStatus && (
                                <div className={cn(
                                  "grid grid-cols-2 gap-2 text-xs mt-4 p-3 rounded-lg",
                                  isDark ? "bg-zinc-900" : "bg-zinc-50"
                                )}>
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                                    <span>WhatsApp: {enrichmentStatus.whatsapp.verificados}/{enrichmentStatus.whatsapp.total_com_telefone}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                                    <span>WHOIS: {enrichmentStatus.whois.enriched}/{enrichmentStatus.whois.total_br}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-purple-500" />
                                    <span>CNPJ: {enrichmentStatus.cnpj.enriched}/{enrichmentStatus.cnpj.total_com_cnpj}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-orange-500" />
                                    <span>Scraping: {enrichmentStatus.scraping.completed}/{enrichmentStatus.scraping.total_com_site}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Renderizar logs de enriquecimento (quando existirem)
                      return filteredEnrichment.map((event: any, index: number) => {
                        const isError = event.level === 'error';
                        const isSuccess = event.level === 'success';
                        const isWarning = event.level === 'warning';

                        const levelColor = isError
                          ? 'bg-red-500'
                          : isWarning
                            ? 'bg-yellow-500'
                            : isSuccess
                              ? 'bg-green-500'
                              : 'bg-blue-500';

                        const textColor = isError
                          ? (isDark ? 'text-red-400' : 'text-red-600')
                          : isWarning
                            ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                            : isSuccess
                              ? (isDark ? 'text-green-400' : 'text-green-600')
                              : (isDark ? 'text-zinc-400' : 'text-zinc-700');

                        return (
                          <div
                            key={index}
                            className={cn(
                              "relative pl-3 py-2 rounded-lg transition-colors",
                              isDark ? "hover:bg-zinc-900/50" : "hover:bg-zinc-50"
                            )}
                          >
                            <div className={cn("absolute left-0 top-2 bottom-2 w-1 rounded-full", levelColor)} />
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[11px] font-mono px-1.5 py-0.5 rounded",
                                    isDark ? "text-zinc-500 bg-zinc-900" : "text-zinc-500 bg-zinc-100"
                                  )}>
                                    {event.timestamp}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] px-2 h-5 font-medium uppercase",
                                      isDark ? "bg-zinc-900 text-zinc-500 border-zinc-800" : "bg-zinc-100 text-zinc-600 border-zinc-300"
                                    )}
                                  >
                                    {event.step}
                                  </Badge>
                                </div>
                              </div>
                              <p className={cn("text-sm leading-relaxed pl-0.5", textColor)}>
                                {event.message}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    }
                    
                    // Se for aba de scraping
                    if (logTab === 'scraping') {
                      const filteredScraping = timeline.filter((event: any) => {
                        if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                        
                        // Buscar logs de scraping por phase OU step_name
                        const isScrapingPhase = event.phase === 'scraping';
                        const isScrapingStep = event.step_name && (
                          event.step_name.toLowerCase().includes('website scraping') ||
                          event.step_name.toLowerCase().includes('scraping profiles') ||
                          event.step_name.toLowerCase().includes('scrape website') ||
                          event.step_name.toLowerCase().includes('scraping')
                        );
                        const isEnrichmentWithScraping = event.phase === 'enrichment' && isScrapingStep;
                        
                        // ✅ MELHORIA: Incluir logs específicos do CNPJ
                        const isCNPJLog = event.step_name && (
                          event.step_name.toLowerCase().includes('migrate_batch') ||
                          event.step_name.toLowerCase().includes('staging_insert') ||
                          event.step_name.toLowerCase().includes('cnpj_api_call') ||
                          event.step_name.toLowerCase().includes('complete') ||
                          event.source === 'cnpj'
                        );
                        
                        return isScrapingPhase || isEnrichmentWithScraping || isCNPJLog;
                      });

                      if (filteredScraping.length === 0) {
                        // Mostrar status do scraping quando não há logs
                        return (
                          <div className={cn(
                            "text-center py-6",
                            isDark ? "text-zinc-500" : "text-zinc-600"
                          )}>
                            <div className="space-y-4">
                              <div className={cn(
                                "mx-auto w-12 h-12 rounded-full flex items-center justify-center",
                                isDark ? "bg-zinc-900" : "bg-zinc-100"
                              )}>
                                <FileText className={cn(
                                  "h-6 w-6",
                                  isDark ? "text-zinc-600" : "text-zinc-400"
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  Website Scraping em andamento
                                </p>
                                <p className="text-xs opacity-70">
                                  Os logs de scraping de websites serão exibidos aqui conforme os perfis são processados.
                                </p>
                              </div>
                              {enrichmentStatus && (
                                <div className={cn(
                                  "grid grid-cols-1 gap-2 text-xs mt-4 p-3 rounded-lg",
                                  isDark ? "bg-zinc-900" : "bg-zinc-50"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <span>Total com Website:</span>
                                    <span className="font-medium">{enrichmentStatus.scraping.total_com_site}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Concluídos:</span>
                                    <span className="text-green-500 font-medium">{enrichmentStatus.scraping.completed}</span>
                                  </div>
                                  {enrichmentStatus.scraping.processing > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span>Processando:</span>
                                      <span className="text-blue-500 font-medium">{enrichmentStatus.scraping.processing}</span>
                                    </div>
                                  )}
                                  {enrichmentStatus.scraping.pending > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span>Pendentes:</span>
                                      <span className="text-yellow-500 font-medium">{enrichmentStatus.scraping.pending}</span>
                                    </div>
                                  )}
                                  {enrichmentStatus.scraping.failed > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span>Falhas:</span>
                                      <span className="text-red-500 font-medium">{enrichmentStatus.scraping.failed}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Renderizar logs de scraping
                      return filteredScraping.map((event: any, index: number) => {
                        const isError = event.level === 'error';
                        const isSuccess = event.level === 'success';
                        const isWarning = event.level === 'warning';

                        const levelColor = isError
                          ? 'bg-red-500'
                          : isWarning
                            ? 'bg-yellow-500'
                            : isSuccess
                              ? 'bg-green-500'
                              : 'bg-blue-500';

                        const textColor = isError
                          ? (isDark ? 'text-red-400' : 'text-red-600')
                          : isWarning
                            ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                            : isSuccess
                              ? (isDark ? 'text-green-400' : 'text-green-600')
                              : (isDark ? 'text-zinc-400' : 'text-zinc-700');

                        return (
                          <div
                            key={index}
                            className={cn(
                              "relative pl-3 py-2 rounded-lg transition-colors",
                              isDark ? "hover:bg-zinc-900/50" : "hover:bg-zinc-50"
                            )}
                          >
                            <div className={cn("absolute left-0 top-2 bottom-2 w-1 rounded-full", levelColor)} />
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[11px] font-mono px-1.5 py-0.5 rounded",
                                    isDark ? "text-zinc-500 bg-zinc-900" : "text-zinc-500 bg-zinc-100"
                                  )}>
                                    {event.timestamp}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-[10px] px-2 h-5 font-medium uppercase",
                                      isDark ? "bg-zinc-900 text-zinc-500 border-zinc-800" : "bg-zinc-100 text-zinc-600 border-zinc-300"
                                    )}
                                  >
                                    {event.step_name || event.step || 'scraping'}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* ✅ MELHORIA: Usar componente especializado para logs CNPJ */}
                              {event.source === 'cnpj' ? (
                                <CNPJLogCard
                                  timestamp={event.timestamp}
                                  step_name={event.step_name}
                                  level={event.level}
                                  message={event.message}
                                  source={event.source}
                                  isDark={isDark}
                                />
                              ) : (
                                <p className={cn("text-sm leading-relaxed pl-0.5", textColor)}>
                                  {event.message}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      });
                    }

                    // Filtrar timeline normal (Todos ou Extração)
                    const filteredTimeline = timeline.filter((event: any) => {
                      const stepLower = (event.step || '').toLowerCase();
                      if (logTab === 'extracao') {
                        // Steps do Google Maps
                        const googleMapsSteps = ['google maps', 'inicialização', 'finalização', 'segmentação', 'compensação', 'compensação filtros', 'correção automática'];
                        // Steps do Instagram Discovery
                        const instagramSteps = ['queries', 'serper query', 'loop complete', 'conclusão', 'ai expansion'];
                        // ✅ Adicionar steps CNPJ
                        const cnpjSteps = ['cnpj_api_call', 'staging_insert', 'migrate_batch', 'complete', 'start'];
                        
                        // Combinar todos os steps de extração
                        const allExtractionSteps = [...googleMapsSteps, ...instagramSteps, ...cnpjSteps];
                        const isExtracao = allExtractionSteps.some(s => stepLower.includes(s.toLowerCase()));
                        
                        // ✅ Incluir logs CNPJ por source
                        const isCNPJSource = event.source === 'cnpj';
                        
                        if (!isExtracao && !isCNPJSource) return false;
                      }
                      if (logLevelFilter !== 'all' && event.level !== logLevelFilter) return false;
                      return true;
                    });

                    if (filteredTimeline.length === 0) {
                      return (
                        <div className={cn(
                          "text-center py-8 text-sm",
                          isDark ? "text-zinc-600" : "text-zinc-500"
                        )}>
                          {analytics.timeline?.length > 0
                            ? "Nenhum log corresponde aos filtros selecionados."
                            : "Nenhuma atividade registrada ainda."
                          }
                        </div>
                      );
                    }

                    return filteredTimeline.map((event: any, index: number) => {
                      const isError = event.level === 'error';
                      const isSuccess = event.level === 'success';
                      const isWarning = event.level === 'warning';
                      const isInfo = event.level === 'info';

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
                          key={index}
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
                                  {event.timestamp}
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
                                  {event.step}
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
                                {event.level || 'info'}
                              </Badge>
                            </div>
                            {/* ✅ MELHORIA: Formato melhorado para logs CNPJ em todas as abas */}
                            {event.source === 'cnpj' ? (
                              <div className="space-y-2">
                                <p className={cn("text-sm leading-relaxed pl-0.5", textColor)}>
                                  {event.message}
                                </p>
                                
                                {/* Detalhes extras para CNPJ */}
                                <div className="flex items-center gap-3 text-xs">
                                  {/* Ícone baseado no step_name */}
                                  {event.step_name?.toLowerCase().includes('cnpj_api_call') && (
                                    <div className="flex items-center gap-1.5">
                                      <Globe className="h-3 w-3 text-blue-500" />
                                      <span className={isDark ? "text-blue-400" : "text-blue-600"}>API CNPJ</span>
                                    </div>
                                  )}
                                  {event.step_name?.toLowerCase().includes('staging_insert') && (
                                    <div className="flex items-center gap-1.5">
                                      <Building2 className="h-3 w-3 text-purple-500" />
                                      <span className={isDark ? "text-purple-400" : "text-purple-600"}>Inserção em Staging</span>
                                    </div>
                                  )}
                                  {event.step_name?.toLowerCase().includes('migrate_batch') && (
                                    <div className="flex items-center gap-1.5">
                                      <ArrowRight className="h-3 w-3 text-green-500" />
                                      <span className={isDark ? "text-green-400" : "text-green-600"}>Migração em Batch</span>
                                    </div>
                                  )}
                                  {event.step_name?.toLowerCase().includes('complete') && (
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span className={isDark ? "text-green-400" : "text-green-600"}>Conclusão</span>
                                    </div>
                                  )}
                                  
                                  {/* Badge de origem CNPJ */}
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[8px] px-1.5 h-4",
                                      isDark 
                                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                                        : "bg-purple-100 text-purple-600 border-purple-300"
                                    )}
                                  >
                                    CNPJ
                                  </Badge>
                                </div>
                              </div>
                            ) : (
                              <p className={cn("text-sm leading-relaxed pl-0.5", textColor)}>
                                {event.message}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Mover Leads */}
      {runInfo && runInfo.funnel_id && runInfo.column_id && (
        <MoveLeadsModal
          theme={theme}
          runId={runId || ''}
          runName={runInfo.run_name || `${runInfo.search_term} - ${runInfo.location}`}
          leadCount={runInfo.created_quantity || 0}
          currentFunnelId={runInfo.funnel_id}
          currentFunnelName={runInfo.funnel_name || 'Kanban'}
          currentColumnId={runInfo.column_id}
          currentColumnName={runInfo.column_name || 'Coluna'}
          open={moveLeadsModalOpen}
          onOpenChange={setMoveLeadsModalOpen}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
