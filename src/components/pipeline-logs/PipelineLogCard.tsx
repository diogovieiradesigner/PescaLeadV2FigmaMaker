import { PipelineLog, PipelineStep } from '../../types/pipeline-logs';
import { cn } from '../ui/utils';
import { CheckCircle2, XCircle, Ban, Clock, Cpu, User, Bot, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';

interface PipelineLogCardProps {
  log: PipelineLog;
  onClick: (log: PipelineLog) => void;
  isDark: boolean;
}

export function PipelineLogCard({ log, onClick, isDark }: PipelineLogCardProps) {
  const statusConfig = {
    success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
    error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
    blocked: { icon: Ban, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    partial: { icon: XCircle, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    running: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" }
  };

  const StatusIcon = statusConfig[log.status]?.icon || Clock;
  const statusStyle = statusConfig[log.status] || statusConfig.running;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      onClick={() => onClick(log)}
      className={cn(
        "group relative flex flex-col gap-3 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
        isDark 
          ? "bg-zinc-900/30 border-white/5 hover:bg-zinc-900/50 hover:border-white/10" 
          : "bg-white border-zinc-200 hover:border-zinc-300"
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isDark ? "bg-white/5" : "bg-zinc-100")}>
            <User className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-zinc-500")} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn("font-medium truncate", isDark ? "text-zinc-200" : "text-zinc-900")}>
                {log.contact_name}
              </h3>
              <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-400")}>
                {log.contact_phone}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Bot className={cn("w-3 h-3", isDark ? "text-zinc-500" : "text-zinc-400")} />
              <span className={cn("text-xs truncate", isDark ? "text-zinc-400" : "text-zinc-500")}>
                {log.agent_name}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full ml-1", 
                isDark ? "bg-white/5 text-zinc-500" : "bg-zinc-100 text-zinc-500"
              )}>
                {formatDate(log.started_at)}
              </span>
            </div>
          </div>
        </div>

        <Badge variant="outline" className={cn("shrink-0 gap-1.5 pr-2.5", statusStyle.bg, statusStyle.color, statusStyle.border)}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span className="capitalize">{log.status === 'success' ? 'Sucesso' : log.status}</span>
        </Badge>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-4 text-xs px-1">
        <div className={cn("flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-zinc-500")}>
          <Clock className="w-3.5 h-3.5" />
          <span>{(log.total_duration_ms / 1000).toFixed(1)}s</span>
        </div>
        <div className={cn("flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-zinc-500")}>
          <Cpu className="w-3.5 h-3.5" />
          <span>{log.total_tokens_used} tokens</span>
        </div>
        <div className={cn("flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-zinc-500")}>
          <span className="font-mono text-[10px] border px-1 rounded">{log.steps_completed}/{log.steps.length}</span>
          <span>steps</span>
        </div>
      </div>

      {/* Steps Visual Timeline (Mini) */}
      <div className="flex items-center gap-1 mt-1 relative">
        {log.steps.map((step, idx) => {
           const stepStatusColor = {
             success: "bg-green-500",
             error: "bg-red-500",
             blocked: "bg-orange-500",
             skipped: "bg-zinc-600",
             running: "bg-blue-500"
           }[step.status] || "bg-zinc-600";

           return (
             <div key={step.id} className="flex items-center flex-1 min-w-0">
               <div 
                 className={cn("h-1.5 w-full rounded-full", stepStatusColor, step.status === 'skipped' && "opacity-30")} 
                 title={`${step.step_name}: ${step.status}`}
               />
               {idx < log.steps.length - 1 && (
                 <div className={cn("h-px w-1 mx-0.5", isDark ? "bg-white/10" : "bg-zinc-200")} />
               )}
             </div>
           );
        })}
      </div>
      
      {/* Chevron for hover effect */}
      <div className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
        isDark ? "text-zinc-500" : "text-zinc-400"
      )}>
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
}