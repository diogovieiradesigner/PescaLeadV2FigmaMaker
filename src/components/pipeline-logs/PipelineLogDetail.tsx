import { PipelineLog, PipelineStep } from '../../types/pipeline-logs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { 
  User, Bot, Calendar, Clock, Cpu, CheckCircle2, XCircle, Ban, 
  ChevronRight, MessageSquare, ArrowRight, Copy, Terminal 
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner@2.0.3';

interface PipelineLogDetailProps {
  log: PipelineLog | null;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function PipelineLogDetail({ log, isOpen, onClose, isDark }: PipelineLogDetailProps) {
  if (!log) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl h-[90vh] flex flex-col p-0 gap-0", isDark ? "bg-zinc-950 border-white/10" : "bg-white")}>
        {/* ✅ Accessibility: Hidden title and description for screen readers */}
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do Pipeline: {log.contact_name}</DialogTitle>
          <DialogDescription>
            Visualização detalhada da execução do pipeline de IA para {log.contact_name}. Status: {log.status}.
          </DialogDescription>
        </DialogHeader>
        
        {/* Header */}
        <div className={cn("px-6 py-4 border-b shrink-0", isDark ? "border-white/10" : "border-zinc-200")}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", isDark ? "bg-white/5" : "bg-zinc-100")}>
                <User className={cn("w-6 h-6", isDark ? "text-zinc-400" : "text-zinc-500")} />
              </div>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {log.contact_name}
                  <Badge variant="outline" className="font-normal text-xs opacity-70">
                    {log.contact_phone}
                  </Badge>
                </h2>
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <Bot className="w-3.5 h-3.5" />
                  <span>{log.agent_name}</span>
                  <span>•</span>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(log.started_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <Badge 
                className={cn(
                  "px-3 py-1 text-sm mb-2", 
                  log.status === 'success' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                  log.status === 'error' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                  "bg-zinc-500/10 text-zinc-500"
                )}
                variant="outline"
              >
                {log.status.toUpperCase()}
              </Badge>
              <div className="flex items-center justify-end gap-4 text-xs opacity-70">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(log.total_duration_ms/1000).toFixed(2)}s</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {log.total_tokens_used} tokens</span>
              </div>
            </div>
          </div>

          {/* Response Preview (if success) */}
          {log.response_text && (
            <div className={cn("p-3 rounded-lg text-sm border", isDark ? "bg-blue-500/5 border-blue-500/10 text-blue-200" : "bg-blue-50 border-blue-100 text-blue-900")}>
              <p className="line-clamp-2 font-medium italic">"{log.response_text}"</p>
            </div>
          )}
          
          {/* Error Preview (if error) */}
          {log.error_message && (
            <div className={cn("p-3 rounded-lg text-sm border", isDark ? "bg-red-500/5 border-red-500/10 text-red-200" : "bg-red-50 border-red-100 text-red-900")}>
              <p className="font-mono text-xs break-all">{log.error_message}</p>
            </div>
          )}
        </div>

        {/* Timeline Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {log.steps.map((step, index) => (
              <PipelineStepItem key={step.id} step={step} isLast={index === log.steps.length - 1} isDark={isDark} onCopy={copyToClipboard} />
            ))}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className={cn("px-6 py-4 border-t shrink-0 flex justify-between items-center", isDark ? "bg-zinc-900/50 border-white/10" : "bg-zinc-50 border-zinc-200")}>
           <span className="text-xs text-muted-foreground font-mono">ID: {log.id}</span>
           <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}>
             <Copy className="w-4 h-4 mr-2" />
             Copiar JSON
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PipelineStepItem({ step, isLast, isDark, onCopy }: { step: PipelineStep, isLast: boolean, isDark: boolean, onCopy: (t: string) => void }) {
  const statusColor = {
    success: "text-green-500 border-green-500",
    error: "text-red-500 border-red-500",
    blocked: "text-orange-500 border-orange-500",
    skipped: "text-zinc-500 border-zinc-500",
    running: "text-blue-500 border-blue-500"
  }[step.status];

  const bgColor = isDark ? "bg-zinc-900" : "bg-white";

  return (
    <div className="relative pl-8">
      {/* Connecting Line */}
      {!isLast && (
        <div className={cn("absolute left-[15px] top-8 bottom-[-32px] w-px", isDark ? "bg-white/10" : "bg-zinc-200")} />
      )}

      {/* Step Icon/Dot */}
      <div className={cn(
        "absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center z-10",
        statusColor,
        bgColor
      )}>
        <span className="text-sm">{step.step_icon}</span>
      </div>

      {/* Content */}
      <div className={cn("rounded-xl border p-4 transition-all", isDark ? "border-white/5 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50/50")}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{step.step_name}</h4>
              <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-normal uppercase tracking-wide", statusColor.split(' ')[0])}>
                {step.status}
              </Badge>
            </div>
            <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-zinc-500")}>
              {step.status_message}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
             {step.duration_ms && <div>{step.duration_ms}ms</div>}
             {step.tokens_total > 0 && <div>{step.tokens_total} tokens</div>}
          </div>
        </div>

        {/* Config/Input/Output Details */}
        <div className="space-y-3 mt-3">
          {/* Config */}
          {step.config && Object.keys(step.config).length > 0 && (
            <div className="text-xs">
              <span className="font-semibold opacity-70 mb-1 block">Configuração:</span>
              <div className={cn("p-2 rounded font-mono overflow-x-auto", isDark ? "bg-black/30 text-zinc-400" : "bg-zinc-100 text-zinc-600")}>
                {JSON.stringify(step.config, null, 1).replace(/[\{\}"]/g, '').trim()}
              </div>
            </div>
          )}

          {/* Input/Output Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {step.input_summary && (
              <div className="text-xs">
                <span className="font-semibold opacity-70 mb-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> Input
                </span>
                <div className={cn("p-2 rounded border", isDark ? "bg-zinc-900/50 border-white/5" : "bg-white border-zinc-200")}>
                  {step.input_summary}
                </div>
              </div>
            )}
            {step.output_summary && (
              <div className="text-xs">
                <span className="font-semibold opacity-70 mb-1 flex items-center gap-1">
                  <Terminal className="w-3 h-3" /> Output
                </span>
                <div className={cn("p-2 rounded border", isDark ? "bg-zinc-900/50 border-white/5" : "bg-white border-zinc-200")}>
                  {step.output_summary}
                </div>
              </div>
            )}
          </div>

          {/* Error Detail */}
          {step.error_message && (
            <div className={cn("mt-2 p-3 rounded text-xs border font-mono", isDark ? "bg-red-950/20 border-red-900/50 text-red-400" : "bg-red-50 border-red-100 text-red-600")}>
              <strong>Erro:</strong> {step.error_message}
            </div>
          )}
          
          {/* View Data Button (if detailed data exists) */}
          {(step.input_data || step.output_data) && (
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-6 text-[10px] mt-2 w-full border border-dashed"
               onClick={() => onCopy(JSON.stringify({ input: step.input_data, output: step.output_data }, null, 2))}
             >
               Copiar Dados Brutos (JSON)
             </Button>
          )}
        </div>
      </div>
    </div>
  );
}