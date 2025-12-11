import { supabase } from '../utils/supabase/client';
import { PipelineLog, PipelineStats, PipelineLogFilters } from '../types/pipeline-logs';

export async function getPipelineLogs(filters: PipelineLogFilters) {
  const { data, error } = await supabase.rpc('get_pipeline_logs', {
    p_workspace_id: filters.workspace_id,
    p_agent_id: filters.agent_id,
    p_conversation_id: filters.conversation_id,
    p_status: filters.status === 'all' ? null : filters.status,
    p_date_from: filters.date_from,
    p_date_to: filters.date_to,
    p_limit: filters.limit || 50,
    p_offset: filters.offset || 0
  });

  if (error) throw error;
  return data as PipelineLog[];
}

export async function countPipelineLogs(filters: PipelineLogFilters) {
  const { data, error } = await supabase.rpc('count_pipeline_logs', {
    p_workspace_id: filters.workspace_id,
    p_agent_id: filters.agent_id,
    p_status: filters.status === 'all' ? null : filters.status,
    p_date_from: filters.date_from,
    p_date_to: filters.date_to
  });

  if (error) throw error;
  return data as number;
}

export async function getPipelineStats(filters: { 
  workspace_id?: string; 
  agent_id?: string; 
  date_from: string; 
  date_to: string 
}) {
  const { data, error } = await supabase.rpc('get_pipeline_stats', {
    p_workspace_id: filters.workspace_id,
    p_agent_id: filters.agent_id,
    p_date_from: filters.date_from,
    p_date_to: filters.date_to
  });

  if (error) throw error;
  return data as PipelineStats;
}

export async function getPipelineDetail(pipelineId: string) {
  const { data, error } = await supabase.rpc('get_pipeline_detail', {
    p_pipeline_id: pipelineId
  });

  if (error) throw error;
  return data as PipelineLog;
}
