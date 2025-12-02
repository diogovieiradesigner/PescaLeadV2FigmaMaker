import { useEffect, useState } from 'react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
import { 
  cancelExtractionRun,
  getExtractionAnalytics
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
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ProfileMenu } from './ProfileMenu';
import { PieChart, Pie, BarChart, Bar, Cell, ResponsiveContainer, Legend, Tooltip, XAxis, YAxis } from 'recharts';

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
              {hoveredItem ? hoveredItem.value : total}
            </div>
            <div className={cn(
              "text-xs transition-all duration-200",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {hoveredItem ? hoveredItem.name : category}
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

export function ExtractionProgress({ theme, onThemeToggle, runId, onBack, onNavigateToSettings }: ExtractionProgressProps) {
  const isDark = theme === 'dark';

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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
          console.log('🔄 Run atualizado via Realtime:', payload.new);
          fetchData(); // Recarregar tudo
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, analytics?.run?.status]);

  // Polling de fallback (caso Realtime não funcione)
  useEffect(() => {
    if (!runId || !analytics?.run) return;
    
    const status = analytics.run.status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') return;

    const interval = setInterval(() => {
      fetchData();
    }, 3000); // Poll a cada 3 segundos

    return () => clearInterval(interval);
  }, [runId, analytics?.run?.status]);

  const fetchData = async () => {
    if (!runId) return;

    try {
      // Don't set loading to true on subsequent updates to avoid flashing
      if (!analytics) setLoading(true);

      const data = await getExtractionAnalytics({ runId });
      setAnalytics(data);
      
      console.log('📊 Analytics carregado:', data);
      console.log('📞 Contatos:', data?.contatos);
      console.log('📈 Run:', data?.run);
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados:', error);
      
      // Erro específico da função RPC
      if (error?.message?.includes('lead_stats') || error?.message?.includes('get_extraction_analytics') || error?.code === '42P01') {
        toast.error('Erro: Função RPC precisa ser corrigida no Supabase. Veja o console.', {
          duration: 8000
        });
        
        // Log visual detalhado no console
        console.log('\n');
        console.log('%c╔════════════════════════════════════════════════════════════════╗', 'color: #ef4444; font-weight: bold');
        console.log('%c║  ❌ ERRO: Função RPC não configurada                          ║', 'color: #ef4444; font-weight: bold');
        console.log('%c╚════════════════════════════════════════════════════════════════╝', 'color: #ef4444; font-weight: bold');
        console.log('\n');
        
        console.log('%c📋 PROBLEMA DETECTADO:', 'color: #f97316; font-weight: bold; font-size: 14px');
        console.log('%c   A função RPC "get_extraction_analytics" está tentando acessar', 'color: #a8a29e');
        console.log('%c   a tabela "lead_stats" que NÃO EXISTE no banco de dados.', 'color: #a8a29e');
        console.log('\n');
        
        console.log('%c✅ SOLUÇÃO RÁPIDA:', 'color: #14b8a6; font-weight: bold; font-size: 14px');
        console.log('%c   1. Abra: %c/SUPABASE_RPC_FIX.md', 'color: #a8a29e', 'color: #14b8a6; font-weight: bold');
        console.log('%c   2. Acesse o SQL Editor no Supabase Dashboard', 'color: #a8a29e');
        console.log('%c   3. Execute o SQL de correção fornecido', 'color: #a8a29e');
        console.log('%c   4. Recarregue esta página', 'color: #a8a29e');
        console.log('\n');
        
        console.log('%c📚 DOCUMENTAÇÃO:', 'color: #a855f7; font-weight: bold; font-size: 14px');
        console.log('%c   • Overview:  %cREADME_ERRO_RPC.md', 'color: #a8a29e', 'color: #a855f7; font-weight: bold');
        console.log('%c   • Fix SQL:   %cSUPABASE_RPC_FIX.md', 'color: #a8a29e', 'color: #a855f7; font-weight: bold');
        console.log('\n');
        
        console.log('%c🔍 ERRO ORIGINAL:', 'color: #71717a; font-weight: bold; font-size: 12px');
        console.log('%c   Code:    ' + (error?.code || 'N/A'), 'color: #71717a; font-size: 11px');
        console.log('%c   Message: ' + (error?.message || 'N/A'), 'color: #71717a; font-size: 11px');
        console.log('\n');
        
        console.log('%c═══════════════════════════════════════════════════════════════', 'color: #27272a');
        console.log('\n');
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
                        "text-4xl font-bold",
                        isDark ? "text-zinc-700" : "text-zinc-300"
                      )}>
                        <AnimatedCounter value={runInfo.success_rate || 0} />%
                      </p>
                    </div>
                  </div>
                  <AnimatedProgressBar percentage={runInfo.success_rate || 0} isDark={isDark} />
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

            {/* Cards Principais - Duplicados e Filtrados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      "text-5xl font-bold",
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

              {/* Filtrados */}
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

              {/* Telefone Fixo */}
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
                    <span className="text-xs font-medium uppercase">WhatsApp Pendente</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>
                        <AnimatedCounter value={analytics.contatos?.whatsapp?.pendente || 0} />
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

              {/* Sites .br */}
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

              {/* Sites Internacionais */}
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
              {/* CNPJ */}
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

              {/* ========== GRUPO LOCALIZAÇÃO ========== */}
              {/* Com Endereço */}
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
              </div>
            </div>

            {/* Seção: Gráficos de Distribuição */}
            {analytics.graficos && (
              <div className="space-y-4">
                <h3 className={cn(
                  "text-base font-semibold uppercase tracking-wider",
                  isDark ? "text-zinc-400" : "text-zinc-700"
                )}>
                  Gráficos de Distribuição
                </h3>

                {/* Grid de Gráficos de Pizza */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
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

                  {/* Pizza: Qualidade */}
                  {analytics.graficos.pizza_qualidade && analytics.graficos.pizza_qualidade.length > 0 && (
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
              {/* Score de Qualidade */}
              {analytics.qualidade && (
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

              {/* Status de Enriquecimento */}
              {analytics.enriquecimento && (
                <Card className={cn(
                  isDark 
                    ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
                    : "bg-white border border-zinc-200"
                )}>
                  <CardContent className="pt-6">
                    <h3 className={cn(
                      "text-lg font-semibold mb-4",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>Status de Enriquecimento</h3>
                    <div className="space-y-3">
                      {/* Scraping */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-sm",
                            isDark ? "text-zinc-400" : "text-zinc-600"
                          )}>Scraping</span>
                          <span className={cn(
                            "text-sm",
                            isDark ? "text-white" : "text-zinc-900"
                          )}>{analytics.enriquecimento?.scraping?.taxa_sucesso || 0}%</span>
                        </div>
                        <div className={cn(
                          "h-2 rounded-full overflow-hidden",
                          isDark ? "bg-zinc-900" : "bg-zinc-200"
                        )}>
                          <div className="h-full flex">
                            <div 
                              className="bg-green-500" 
                              style={{ width: `${analytics.enriquecimento?.scraping?.sucesso && analytics.contatos?.total ? (analytics.enriquecimento.scraping.sucesso / analytics.contatos.total) * 100 : 0}%` }}
                            />
                            <div 
                              className="bg-red-500" 
                              style={{ width: `${analytics.enriquecimento?.scraping?.erro && analytics.contatos?.total ? (analytics.enriquecimento.scraping.erro / analytics.contatos.total) * 100 : 0}%` }}
                            />
                            <div 
                              className={cn(isDark ? "bg-zinc-600" : "bg-zinc-400")}
                              style={{ width: `${analytics.enriquecimento?.scraping?.pendente && analytics.contatos?.total ? (analytics.enriquecimento.scraping.pendente / analytics.contatos.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className={cn(isDark ? "text-green-500" : "text-green-600")}>✓ {analytics.enriquecimento?.scraping?.sucesso || 0}</span>
                          <span className={cn(isDark ? "text-red-500" : "text-red-600")}>✗ {analytics.enriquecimento?.scraping?.erro || 0}</span>
                          <span className={cn(isDark ? "text-zinc-500" : "text-zinc-600")}>⏳ {analytics.enriquecimento?.scraping?.pendente || 0}</span>
                        </div>
                      </div>

                      {/* WHOIS */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-sm",
                            isDark ? "text-zinc-400" : "text-zinc-600"
                          )}>WHOIS</span>
                          <span className={cn(
                            "text-sm",
                            isDark ? "text-white" : "text-zinc-900"
                          )}>{analytics.enriquecimento?.whois?.taxa_sucesso || 0}%</span>
                        </div>
                        <div className={cn(
                          "h-2 rounded-full overflow-hidden",
                          isDark ? "bg-zinc-900" : "bg-zinc-200"
                        )}>
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${analytics.enriquecimento?.whois?.taxa_sucesso || 0}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className={cn(isDark ? "text-blue-500" : "text-blue-600")}>✓ {analytics.enriquecimento?.whois?.sucesso || 0}</span>
                          <span className={cn(isDark ? "text-zinc-500" : "text-zinc-600")}>⏳ {analytics.enriquecimento?.whois?.pendente || 0}</span>
                        </div>
                      </div>

                      {/* Migração */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-sm",
                            isDark ? "text-zinc-400" : "text-zinc-600"
                          )}>Migração para CRM</span>
                          <span className={cn(
                            "text-sm",
                            isDark ? "text-white" : "text-zinc-900"
                          )}>{analytics.enriquecimento?.migracao?.taxa || 0}%</span>
                        </div>
                        <div className={cn(
                          "h-2 rounded-full overflow-hidden",
                          isDark ? "bg-zinc-900" : "bg-zinc-200"
                        )}>
                          <div 
                            className="h-full bg-purple-500" 
                            style={{ width: `${analytics.enriquecimento?.migracao?.taxa || 0}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className={cn(isDark ? "text-purple-500" : "text-purple-600")}>✓ {analytics.enriquecimento?.migracao?.migrado || 0}</span>
                          <span className={cn(isDark ? "text-zinc-500" : "text-zinc-600")}>⏳ {analytics.enriquecimento?.migracao?.pendente || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Timeline */}
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
                <div className="flex items-center justify-between">
                  <CardTitle className={cn(
                    "text-base font-semibold",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    Atividade
                  </CardTitle>
                  <Badge variant="outline" className={cn(
                    "font-normal",
                    isDark 
                      ? "bg-zinc-900 border-zinc-800 text-zinc-500" 
                      : "bg-zinc-100 border-zinc-300 text-zinc-600"
                  )}>
                    {analytics.timeline?.length || 0} eventos
                  </Badge>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-6 space-y-8">
                  {analytics.timeline && analytics.timeline.length > 0 ? (
                    analytics.timeline.map((event: any, index: number) => {
                      const isError = event.level === 'error';
                      const isSuccess = event.level === 'success';
                      
                      return (
                        <div key={index} className="relative pl-6">
                          {/* Line connecting dots */}
                          {index !== analytics.timeline.length - 1 && (
                            <div className={cn(
                              "absolute left-[5px] top-2 h-[calc(100%+2rem)] w-[1px]",
                              isDark ? "bg-zinc-800" : "bg-zinc-300"
                            )} />
                          )}
                          
                          {/* Dot */}
                          <div className={cn(
                            "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2",
                            isDark ? 'bg-black' : 'bg-white',
                            isError ? 'border-red-500' : 
                            isSuccess ? 'border-green-500' : 
                            'border-green-500'
                          )} />
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                "text-xs font-mono",
                                isDark ? "text-zinc-500" : "text-zinc-600"
                              )}>
                                {event.timestamp}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-[10px] px-2 h-5 font-medium tracking-wide uppercase",
                                  isDark 
                                    ? "bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800" 
                                    : "bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200"
                                )}
                              >
                                {event.step}
                              </Badge>
                            </div>
                            <p className={cn(
                              "text-sm leading-relaxed",
                              isError 
                                ? (isDark ? 'text-red-400' : 'text-red-600')
                                : (isDark ? 'text-zinc-400' : 'text-zinc-700')
                            )}>
                              {event.message}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={cn(
                      "text-center py-8 text-sm",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )}>
                      Nenhuma atividade registrada ainda.
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
