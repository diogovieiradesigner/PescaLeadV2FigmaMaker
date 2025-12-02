import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';

export interface PipelineStep {
  number: number;
  key: string;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  tokensTotal: number | null;
  costEstimate: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
  model: string | null;
  config: any | null;
}

export interface PipelineInfo {
  id: string;
  status: string;
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalDurationMs: number | null;
  totalTokensUsed: number | null;
  totalCostEstimate: number | null;
  stepsCompleted: number | null;
  responseSent: boolean;
  errorMessage: string | null;
  errorStep: string | null;
  steps: PipelineStep[];
}

export function usePipelineLogs(pipelineId: string | null | undefined) {
  const [pipeline, setPipeline] = useState<PipelineInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pipelineId) {
      setPipeline(null);
      return;
    }

    let isMounted = true;

    const loadPipeline = async () => {
      try {
        setLoading(true);

        // Buscar dados do pipeline
        const { data: pipelineData, error: pipelineError } = await supabase
          .from('ai_pipeline_logs')
          .select('*')
          .eq('id', pipelineId)
          .single();

        if (pipelineError) {
          console.error('[usePipelineLogs] Error loading pipeline:', pipelineError);
          return;
        }

        // Buscar steps do pipeline
        const { data: stepsData, error: stepsError } = await supabase
          .from('ai_pipeline_steps')
          .select('*')
          .eq('pipeline_log_id', pipelineId)
          .order('step_number', { ascending: true });

        if (stepsError) {
          console.error('[usePipelineLogs] Error loading steps:', stepsError);
          return;
        }

        if (!isMounted) return;

        // Montar o objeto PipelineInfo
        const pipelineInfo: PipelineInfo = {
          id: pipelineData.id,
          status: pipelineData.status,
          statusMessage: pipelineData.status_message,
          startedAt: pipelineData.started_at,
          completedAt: pipelineData.completed_at,
          totalDurationMs: pipelineData.total_duration_ms,
          totalTokensUsed: pipelineData.total_tokens_used,
          totalCostEstimate: pipelineData.total_cost_estimate,
          stepsCompleted: pipelineData.steps_completed,
          responseSent: pipelineData.response_sent,
          errorMessage: pipelineData.error_message,
          errorStep: pipelineData.error_step,
          steps: (stepsData || []).map((step: any) => ({
            number: step.step_number,
            key: step.step_key,
            name: step.step_name,
            icon: step.step_icon,
            status: step.status,
            statusMessage: step.status_message,
            startedAt: step.started_at,
            completedAt: step.completed_at,
            durationMs: step.duration_ms,
            tokensInput: step.tokens_input,
            tokensOutput: step.tokens_output,
            tokensTotal: step.tokens_total,
            costEstimate: step.cost_estimate,
            inputSummary: step.input_summary,
            outputSummary: step.output_summary,
            errorMessage: step.error_message,
            model: step.model,
            config: step.config,
          })),
        };

        setPipeline(pipelineInfo);
      } catch (error) {
        console.error('[usePipelineLogs] Error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPipeline();

    return () => {
      isMounted = false;
    };
  }, [pipelineId]);

  return { pipeline, loading };
}