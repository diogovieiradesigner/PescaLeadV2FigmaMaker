import React, { useState } from 'react';
import { PipelineInfo, PipelineStep } from '../hooks/useAIBuilderChat';
import { 
  ChevronDown, 
  ChevronRight,
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  Clock,
  Zap,
  Shield,
  Mail,
  Brain,
  BookOpen,
  MessageSquare,
  Save
} from 'lucide-react';

// ==================== MAPEAMENTO DE ÍCONES ====================

const STEP_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  setup: Zap,
  debouncer: Mail,
  guardrail: Shield,
  orchestrator: Brain,
  rag: BookOpen,
  llm: MessageSquare,
  preview_save: Save,
};

// ==================== COMPONENTE DE STEP ====================

interface StepItemProps {
  step: PipelineStep;
  isLast: boolean;
  isDark?: boolean;
}

const StepItem: React.FC<StepItemProps> = ({ step, isLast, isDark = false }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getIcon = () => {
    switch (step.type) {
      case 'rag': return <BookOpen size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />;
      case 'tool': return <Zap size={14} className={isDark ? 'text-yellow-400' : 'text-yellow-600'} />;
      case 'guardrail': return <Shield size={14} className={isDark ? 'text-purple-400' : 'text-purple-600'} />;
      case 'message_grouping': return <MessageSquare size={14} className={isDark ? 'text-green-400' : 'text-green-600'} />;
      case 'email': return <Mail size={14} className={isDark ? 'text-red-400' : 'text-red-600'} />;
      case 'llm': return <Brain size={14} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />;
      case 'save': return <Save size={14} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />;
      default: return <Zap size={14} className={isDark ? 'text-gray-400' : 'text-gray-600'} />;
    }
  };
  
  const getStatusIcon = () => {
    switch (step.status) {
      case 'success':
        return <CheckCircle2 size={12} className="text-green-400" />;
      case 'error':
        return <XCircle size={12} className="text-red-400" />;
      case 'skipped':
        return <MinusCircle size={12} className={isDark ? 'text-gray-500' : 'text-gray-400'} />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`${!isLast ? (isDark ? 'border-b border-white/10' : 'border-b border-gray-200') : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-2 py-2.5 flex items-center gap-2 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} transition-colors rounded text-left`}
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{step.name}</span>
            
            <div className="flex-shrink-0">
              {expanded ? <ChevronDown size={12} className={isDark ? 'text-gray-400' : 'text-gray-600'} /> : <ChevronRight size={12} className={isDark ? 'text-gray-400' : 'text-gray-600'} />}
            </div>
          </div>
          
          {step.statusMessage && (
            <div className={`text-[10px] text-left ${isDark ? 'text-gray-500' : 'text-gray-600'} truncate mt-0.5`}>
              {step.statusMessage.replace('[PREVIEW] ', '').replace(/^[✅❌📨ℹ️⚠️]\s*/, '')}
            </div>
          )}
          
          {step.status === 'error' && step.errorMessage && !expanded && (
            <div className="mt-1 text-[10px] text-left text-red-400 truncate">
              {step.errorMessage}
            </div>
          )}
        </div>
        
        {/* Status icon */}
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
      </button>
      
      {/* Detalhes expandidos */}
      {expanded && (
        <div className={`mb-2 ml-7 mr-3 ${isDark ? 'bg-black border-gray-800' : 'bg-gray-100 border-gray-300'} rounded border p-2 space-y-1 overflow-hidden`}>
          {step.model && (
            <div className="text-[10px] break-words">
              <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Model:</span>
              <span className={`ml-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{step.model}</span>
            </div>
          )}
          {step.inputSummary && (
            <div className="text-[10px] break-words overflow-wrap-anywhere">
              <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Input:</span>
              <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{step.inputSummary}</span>
            </div>
          )}
          {step.outputSummary && (
            <div className="text-[10px] break-words overflow-wrap-anywhere">
              <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Output:</span>
              <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{step.outputSummary}</span>
            </div>
          )}
          
          {/* Detalhes especiais para Transcrição */}
          {step.key === 'transcription' && (step.inputData || step.config) && (
            <div className="text-[10px] space-y-1 pt-1 border-t border-white/10">
              {step.inputData && (
                <div className="flex items-center gap-2">
                  <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Mídias:</span>
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                    {step.inputData.completed || 0}/{step.inputData.total_media || 0} transcrita(s)
                  </span>
                </div>
              )}
              {step.config && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    {step.config.has_audio && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                        🎤 Áudio
                      </span>
                    )}
                    {step.config.has_image && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        🖼️ Imagem
                      </span>
                    )}
                  </div>
                  {step.config.audio_provider && (
                    <div>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Audio Provider:</span>
                      <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{step.config.audio_provider}</span>
                    </div>
                  )}
                  {step.config.image_provider && (
                    <div>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Image Provider:</span>
                      <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{step.config.image_provider}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {(step.tokensInput != null || step.tokensOutput != null) && (
            <div className="text-[10px]">
              <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Tokens:</span>
              <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {step.tokensInput ?? 0} in → {step.tokensOutput ?? 0} out = {step.tokensTotal ?? 0} total
              </span>
            </div>
          )}
          {step.costEstimate != null && step.costEstimate > 0 && (
            <div className="text-[10px]">
              <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>Cost:</span>
              <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>${step.costEstimate.toFixed(6)}</span>
            </div>
          )}
          {step.errorMessage && (
            <div className={`mt-1.5 p-1.5 ${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-100 border-red-300'} rounded border text-[10px] text-red-400`}>
              {step.errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

interface PipelineLogsViewerProps {
  pipeline: PipelineInfo | null | undefined;
  defaultExpanded?: boolean;
  isDark?: boolean;
  inline?: boolean; // ✅ Modo inline para chat real (sem absolute positioning)
}

export const PipelineLogsViewer: React.FC<PipelineLogsViewerProps> = ({ 
  pipeline, 
  defaultExpanded = false,
  isDark = false,
  inline = false // ✅ Por padrão, usar dropdown absoluto (preview)
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (!pipeline) {
    return null;
  }
  
  const successSteps = pipeline.steps.filter(s => s.status === 'success').length;
  const errorSteps = pipeline.steps.filter(s => s.status === 'error').length;
  const totalSteps = pipeline.steps.length;
  
  return (
    <div className="inline-block w-full">
      {/* Header - Inline compacto */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center gap-1 ${inline ? 'px-0' : 'px-2 py-1.5'} ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'} transition-colors ${inline ? '' : 'w-full justify-start rounded'}`}
      >
        {isExpanded ? <ChevronDown size={10} className={isDark ? 'text-gray-400' : 'text-gray-500'} /> : <ChevronRight size={10} className={isDark ? 'text-gray-400' : 'text-gray-500'} />}
        <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pipeline</span>
        
        {/* Badge de status */}
        <span className={`px-1 py-0.5 text-[9px] font-medium rounded ${
          errorSteps > 0 
            ? 'bg-red-500/20 text-red-300' 
            : 'bg-green-500/20 text-green-300'
        }`}>
          {successSteps}/{totalSteps}
        </span>
        
        {/* Tokens e Tempo quando fechado */}
        {!isExpanded && (
          <>
            {pipeline.totalTokensUsed != null && pipeline.totalTokensUsed > 0 && (
              <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {pipeline.totalTokensUsed} tokens
              </span>
            )}
            {pipeline.totalDurationMs != null && (
              <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-0.5`}>
                <Clock size={9} />
                {(pipeline.totalDurationMs / 1000).toFixed(1)}s
              </span>
            )}
          </>
        )}
      </button>
      
      {/* Conteúdo expandido - Sempre inline, ocupa espaço normalmente */}
      {isExpanded && (
        <div className={`mt-2 max-w-md rounded-md ${isDark ? 'bg-black border-white/20' : 'bg-white border-gray-300'} border overflow-hidden p-3 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin`}>
          {pipeline.steps.map((step, index) => (
            <StepItem 
              key={step.key} 
              step={step} 
              isLast={index === pipeline.steps.length - 1}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelineLogsViewer;