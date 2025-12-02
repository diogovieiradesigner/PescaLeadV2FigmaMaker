// ==================== TIPOS DA ABA I.A & AUTOMAÇÃO ====================

export interface IAStatsCards {
  msgs_ia: {
    value: number;
    previous: number;
    change_percent: number;
  };
  followups: {
    value: number;
    previous: number;
    change_percent: number;
  };
  success_rate: {
    value: number;
    ia_only: number;
    with_human: number;
    total: number;
    previous_rate: number;
    change_pp: number;
  };
  time_saved: {
    hours: number;
    minutes: number;
    previous_hours: number;
    change_percent: number;
  };
  period: {
    start: string;
    end: string;
    comparison_start: string;
    comparison_end: string;
  };
}

export interface IAvsHumanData {
  ia: {
    value: number;
    percentage: number;
    color: string;
    label: string;
  };
  human: {
    value: number;
    percentage: number;
    color: string;
    label: string;
  };
  total: number;
  has_data: boolean;
  chart_data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface IASuccessRateData {
  ia_only: {
    value: number;
    percentage: number;
    label: string;
    description: string;
  };
  with_human: {
    value: number;
    percentage: number;
    label: string;
    description: string;
  };
  total: number;
  success_rate: number;
  has_data: boolean;
}

export interface FollowupCategory {
  position: number;
  name: string;
  sent: number;
}

export interface FollowupStatsData {
  total_sent: number;
  with_response: {
    value: number;
    percentage: number;
  };
  without_response: {
    value: number;
    percentage: number;
  };
  response_rate: number;
  avg_response_time_hours: number;
  categories: FollowupCategory[];
  has_data: boolean;
}

export interface TimeSavingsData {
  ai_messages: {
    count: number;
    minutes_per_msg: number;
    total_minutes: number;
    hours: number;
    formula: string;
  };
  followups: {
    count: number;
    minutes_per_followup: number;
    total_minutes: number;
    hours: number;
    formula: string;
  };
  total: {
    minutes: number;
    hours: number;
    previous_hours: number;
    change_percent: number;
  };
  money: {
    hourly_rate: number;
    total_saved: number;
    formula: string;
  };
  comparison: {
    previous_hours: number;
    change_percent: number;
    change_direction: string;
  };
}

export interface IATabCompleteData {
  stats_cards: IAStatsCards;
  ia_vs_human: IAvsHumanData;
  success_rate: IASuccessRateData;
  followup_stats: FollowupStatsData;
  time_savings: TimeSavingsData;
}
