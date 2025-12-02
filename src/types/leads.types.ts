// Types para a aba Leads do Dashboard

export interface LeadsSummary {
  captured: {
    value: number;
    previous: number;
    change_percent: number;
  };
  by_stage: Array<{
    name: string;
    full_name: string;
    count: number;
  }>;
  by_source: Array<{
    name: string;
    count: number;
  }>;
  period: {
    start: string;
    end: string;
    comparison_start: string;
    comparison_end: string;
  };
}

export interface FunnelDetailed {
  stages: Array<{
    title: string;
    position: number;
    count: number;
    color: string;
    conversion_rate: number;
    converted_count: number;
  }>;
  summary: {
    total_first_stage: number;
    total_last_stage: number;
    conversion_rate: number;
    avg_time_days: number;
  };
}

export interface TopSourcesByConversion {
  sources: Array<{
    position: number;
    name: string;
    conversion_rate: number;
    converted: number;
    total: number;
  }>;
}

export interface LeadsCaptureEvolution {
  evolution: Array<{
    date: string;
    day_short: string;
    count: number;
  }>;
  total: number;
}

export interface LeadsDetailedStats {
  captured: {
    value: number;
    previous: number;
    change_percent: number;
  };
  qualification_rate: {
    value: number;
    qualified: number;
    total: number;
    previous_rate: number;
    change_percent: number;
  };
  avg_time_days: {
    value: number;
    previous: number;
    change_minutes: number;
  };
}

export interface LeadsFilters {
  startDate: Date;
  endDate: Date;
  funnelId?: string | null;
}
