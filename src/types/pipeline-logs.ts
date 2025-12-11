export interface PipelineStep {
  id: string;
  step_number: number;
  step_key: string;
  step_name: string;
  step_icon: string;
  status: 'success' | 'error' | 'skipped' | 'blocked' | 'running';
  status_message: string;
  started_at: string;
  completed_at: string;
  duration_ms: number | null;
  config: any | null;
  input_summary: string | null;
  input_data: any | null;
  output_summary: string | null;
  output_data: any | null;
  tokens_input: number | null;
  tokens_output: number | null;
  tokens_total: number;
  error_message: string | null;
  error_details: any | null;
}

export interface PipelineLog {
  id: string;
  conversation_id: string;
  agent_id: string;
  workspace_id: string | null;
  contact_name: string;
  contact_phone: string;
  agent_name: string;
  status: 'running' | 'success' | 'error' | 'blocked' | 'partial';
  status_message: string;
  started_at: string;
  completed_at: string | null;
  total_duration_ms: number;
  total_tokens_used: number;
  steps_completed: number;
  response_text: string | null;
  response_sent: boolean;
  provider_message_id: string | null;
  error_message: string | null;
  error_step: string | null;
  steps: PipelineStep[];
}

export interface PipelineStats {
  total_pipelines: number;
  success_count: number;
  error_count: number;
  blocked_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tokens: number;
  avg_tokens_per_pipeline: number;
  pipelines_by_status: {
    success: number;
    error: number;
    blocked: number;
    [key: string]: number;
  };
  pipelines_by_day: Array<{
    date: string;
    total: number;
    success: number;
    error: number;
  }>;
}

export interface PipelineLogFilters {
  workspace_id?: string;
  agent_id?: string;
  conversation_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
