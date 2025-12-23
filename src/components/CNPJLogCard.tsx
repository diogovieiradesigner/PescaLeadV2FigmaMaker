import { cn } from './ui/utils';
import { Badge } from './ui/badge';
import { 
  Globe, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  XCircle,
  Info
} from 'lucide-react';

interface CNPJLogCardProps {
  timestamp: string;
  step_name?: string;
  level: string;
  message: string;
  source: string;
  isDark: boolean;
}

export function CNPJLogCard({ timestamp, step_name, level, message, source, isDark }: CNPJLogCardProps) {
  const getStepIcon = () => {
    if (!step_name) return <Info className="h-3 w-3" />;
    
    const stepLower = step_name.toLowerCase();
    if (stepLower.includes('cnpj_api_call')) return <Globe className="h-3 w-3 text-blue-500" />;
    if (stepLower.includes('staging_insert')) return <Building2 className="h-3 w-3 text-purple-500" />;
    if (stepLower.includes('migrate_batch')) return <ArrowRight className="h-3 w-3 text-green-500" />;
    if (stepLower.includes('complete')) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (stepLower.includes('start')) return <Clock className="h-3 w-3 text-blue-500" />;
    
    return <Info className="h-3 w-3" />;
  };

  const getStepLabel = () => {
    if (!step_name) return 'CNPJ';
    
    const stepLower = step_name.toLowerCase();
    if (stepLower.includes('cnpj_api_call')) return 'API CNPJ';
    if (stepLower.includes('staging_insert')) return 'Inserção em Staging';
    if (stepLower.includes('migrate_batch')) return 'Migração em Batch';
    if (stepLower.includes('complete')) return 'Conclusão';
    if (stepLower.includes('start')) return 'Início';
    
    return step_name;
  };

  const getLevelColor = () => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'info': 
      default: return 'text-blue-400';
    }
  };

  const getLevelIcon = () => {
    switch (level) {
      case 'error': return <XCircle className="h-3 w-3" />;
      case 'warning': return <AlertCircle className="h-3 w-3" />;
      case 'success': return <CheckCircle2 className="h-3 w-3" />;
      case 'info': 
      default: return <Info className="h-3 w-3" />;
    }
  };

  const isError = level === 'error';
  const isSuccess = level === 'success';
  const isWarning = level === 'warning';

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
      className={cn(
        "relative pl-3 py-2 rounded-lg transition-colors",
        isDark ? "hover:bg-zinc-900/50" : "hover:bg-zinc-50"
      )}
    >
      {/* Indicador lateral colorido */}
      <div className={cn("absolute left-0 top-2 bottom-2 w-1 rounded-full", levelColor)} />
      
      <div className="space-y-2">
        {/* Header com timestamp e badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[11px] font-mono px-1.5 py-0.5 rounded",
              isDark ? "text-zinc-500 bg-zinc-900" : "text-zinc-500 bg-zinc-100"
            )}>
              {timestamp}
            </span>
            
            {/* Badge do step */}
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-2 h-5 font-medium uppercase",
                isDark ? "bg-zinc-900 text-zinc-500 border-zinc-800" : "bg-zinc-100 text-zinc-600 border-zinc-300"
              )}
            >
              {step_name || 'cnpj'}
            </Badge>
          </div>
          
          {/* Badge do nível */}
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
            {getLevelIcon()}
            <span className="ml-1">{level}</span>
          </Badge>
        </div>

        {/* Mensagem principal */}
        <p className={cn("text-sm leading-relaxed pl-0.5", textColor)}>
          {message}
        </p>

        {/* Detalhes extras para CNPJ */}
        <div className="flex items-center gap-3 text-xs">
          {/* Ícone e label do step */}
          <div className="flex items-center gap-1.5">
            {getStepIcon()}
            <span className={getLevelColor()}>{getStepLabel()}</span>
          </div>
          
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
    </div>
  );
}