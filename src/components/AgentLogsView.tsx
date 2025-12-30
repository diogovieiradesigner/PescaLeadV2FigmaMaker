import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Search, Filter, Download, Terminal, Calendar, ChevronLeft, ChevronRight, Sun, Moon, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Theme } from '../hooks/useTheme';
import { cn } from './ui/utils';
import { PipelineLog, PipelineStats, PipelineLogFilters } from '../types/pipeline-logs';
import { getPipelineLogs, getPipelineStats, countPipelineLogs } from '../services/pipeline-logs-service';
import { PipelineStatsWidget } from './pipeline-logs/PipelineStatsWidget';
import { PipelineLogCard } from './pipeline-logs/PipelineLogCard';
import { PipelineLogDetail } from './pipeline-logs/PipelineLogDetail';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { ProfileMenu } from './ProfileMenu';
import { useAuth } from '../contexts/AuthContext';

interface AgentLogsViewProps {
  theme: Theme;
  onBack: () => void;
  onThemeToggle: () => void;
  onNavigateToSettings?: () => void;
}

export function AgentLogsView({ theme, onBack, onThemeToggle, onNavigateToSettings }: AgentLogsViewProps) {
  // ✅ Contexto de autenticação
  const { currentWorkspace } = useAuth();
  
  const isDark = theme === 'dark';
  const containerClass = isDark ? "bg-black text-white" : "bg-white text-zinc-950";

  // State
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<PipelineLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState<PipelineLogFilters>({
    limit: 20,
    offset: 0,
    status: 'all',
    date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days default
    date_to: new Date().toISOString()
  });

  // Fetch Data
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // ✅ Usar workspace do contexto de autenticação
      if (!currentWorkspace?.id) {
        return;
      }

      const workspaceId = currentWorkspace.id;
      
      const currentFilters = { ...filters, workspace_id: workspaceId };

      const [logsData, statsData, countData] = await Promise.all([
        getPipelineLogs(currentFilters),
        getPipelineStats({ 
          workspace_id: workspaceId, 
          date_from: filters.date_from!, 
          date_to: filters.date_to! 
        }),
        countPipelineLogs(currentFilters)
      ]);

      setLogs(logsData || []);
      setStats(statsData);
      setTotalLogs(countData || 0);

    } catch (error) {
      console.error('Error fetching pipeline logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchData();
    }
  }, [currentWorkspace?.id, filters.status, filters.limit, filters.offset, filters.date_from]); // ✅ Re-fetch when workspace or filters change

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleLogClick = (log: PipelineLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const totalPages = Math.ceil(totalLogs / (filters.limit || 20));
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;

  return (
    <div className={cn("h-screen w-full flex flex-col overflow-hidden", containerClass)}>
      {/* Header */}
      <div className={cn(
        "shrink-0 h-16 border-b flex items-center justify-between px-6 transition-colors",
        isDark ? "bg-black border-white/[0.08]" : "bg-white border-zinc-200"
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
            <h1 className="text-lg font-semibold tracking-tight">Logs do Sistema de Agentes</h1>
            <div className={cn("h-4 w-px", isDark ? "bg-white/10" : "bg-zinc-200")} />
            <Badge variant="outline" className={cn(isDark ? "border-white/10 text-zinc-400" : "text-muted-foreground")}>
              Pipeline Inspector
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="relative">
               <select
                 value={filters.status}
                 onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any, offset: 0 }))}
                 style={isDark ? { colorScheme: 'dark' } : undefined}
                 className={cn(
                   "w-[140px] h-9 text-xs appearance-none rounded-md border px-3 pr-8 font-medium transition-colors focus:outline-none",
                   isDark
                     ? "bg-black border-white/[0.1] text-white hover:border-white/[0.2] focus:border-white/[0.2]"
                     : "bg-white border-zinc-200 text-zinc-900"
                 )}
               >
                 <option value="all" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Todos os Status</option>
                 <option value="success" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Sucesso</option>
                 <option value="error" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Erro</option>
                 <option value="blocked" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Bloqueado</option>
                 <option value="running" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Em andamento</option>
               </select>
               <ChevronDown className={cn(
                 "absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-50",
                 isDark ? "text-white" : "text-zinc-900"
               )} />
             </div>

             <div className="relative">
               <select
                 value={filters.limit?.toString()}
                 onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), offset: 0 }))}
                 style={isDark ? { colorScheme: 'dark' } : undefined}
                 className={cn(
                   "w-[100px] h-9 text-xs appearance-none rounded-md border px-3 pr-8 font-medium transition-colors focus:outline-none",
                   isDark
                     ? "bg-black border-white/[0.1] text-white hover:border-white/[0.2] focus:border-white/[0.2]"
                     : "bg-white border-zinc-200 text-zinc-900"
                 )}
               >
                 <option value="10" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>10 itens</option>
                 <option value="20" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>20 itens</option>
                 <option value="50" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>50 itens</option>
                 <option value="100" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>100 itens</option>
               </select>
               <ChevronDown className={cn(
                 "absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-50",
                 isDark ? "text-white" : "text-zinc-900"
               )} />
             </div>

             <Button 
               variant="outline" 
               size="sm" 
               className={cn(
                 "gap-2 h-9 text-xs border font-medium",
                 isDark 
                   ? "bg-black border-white/[0.1] hover:bg-zinc-900 hover:border-white/[0.2] text-white" 
                   : "bg-white hover:bg-zinc-50"
               )}
               onClick={() => fetchData(true)}
               disabled={refreshing || loading}
             >
               <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
               Atualizar
             </Button>
           </div>

           <div className={cn("h-6 w-px", isDark ? "bg-white/10" : "bg-zinc-200")} />

           <div className="flex items-center gap-2">
              <button 
                onClick={onThemeToggle}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-zinc-100'
                )}
                title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-white/50" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-500" />
                )}
              </button>
              
              <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto space-y-6">
           {/* Stats Widget */}
           <PipelineStatsWidget stats={stats} loading={loading && !stats} isDark={isDark} />

           {/* Logs List */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-lg font-semibold flex items-center gap-2">
                 <Terminal className="w-5 h-5" />
                 Atendimentos Recentes
               </h3>
               <span className="text-sm text-muted-foreground">
                 Mostrando {logs.length} de {totalLogs} registros
               </span>
             </div>

             {loading && !logs.length ? (
               <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                   <Card key={i} className={cn("h-24 animate-pulse", isDark ? "bg-zinc-900/30 border-white/5" : "bg-white border-zinc-100")} />
                 ))}
               </div>
             ) : logs.length > 0 ? (
               <div className="grid gap-3">
                 {logs.map((log) => (
                   <PipelineLogCard 
                     key={log.id} 
                     log={log} 
                     isDark={isDark} 
                     onClick={handleLogClick} 
                   />
                 ))}
               </div>
             ) : (
               <div className="text-center py-20 opacity-50">
                 <Terminal className="w-12 h-12 mx-auto mb-4" />
                 <p>Nenhum log encontrado com os filtros atuais.</p>
               </div>
             )}

             {/* Pagination */}
             {totalLogs > 0 && (
               <div className="flex items-center justify-center gap-4 pt-4 pb-8">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => handlePageChange((filters.offset || 0) - (filters.limit || 20))}
                   disabled={filters.offset === 0}
                 >
                   <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                 </Button>
                 <span className="text-sm text-muted-foreground">
                   Página {currentPage} de {totalPages}
                 </span>
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 20))}
                   disabled={currentPage >= totalPages}
                 >
                   Próximo <ChevronRight className="w-4 h-4 ml-2" />
                 </Button>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Detail Modal */}
      <PipelineLogDetail 
        log={selectedLog} 
        isOpen={detailOpen} 
        onClose={() => setDetailOpen(false)} 
        isDark={isDark} 
      />
    </div>
  );
}
