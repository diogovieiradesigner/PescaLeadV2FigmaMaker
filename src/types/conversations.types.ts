// ============================================
// TIPOS PARA CONVERSAS ANALYTICS
// ============================================

// Filtros de Conversas
export interface ConversationsFilters {
  startDate: Date;
  endDate: Date;
}

// ============================================
// 1. get_conversations_summary
// ============================================

export interface ConversationsSummaryData {
  active: {
    value: number;
    previous: number;
    change_percent: number;
  };
  ai: {
    value: number;
    percentage: number;
    previous: number;
    change_percent: number;
  };
  human: {
    value: number;
    percentage: number;
    previous: number;
    change_percent: number;
  };
  avg_response_time: {
    value: number;
    previous: number;
    change_percent: number;
    is_improvement: boolean;
  };
  period: {
    start: string;
    end: string;
    comparison_start: string;
    comparison_end: string;
  };
}

// ============================================
// 2. get_ai_vs_human_distribution
// ============================================

export interface AiVsHumanDistributionData {
  total: number;
  distribution: {
    ai: {
      value: number;
      percentage: number;
      color: string;
    };
    human: {
      value: number;
      percentage: number;
      color: string;
    };
  };
  chart_data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  metrics: {
    assumed: {
      value: number;
      percentage: number;
    };
    archived: {
      value: number;
      percentage: number;
    };
    assumption_rate: number;
  };
}

// ============================================
// 3. get_response_time_comparison
// ============================================

export interface ResponseTimeComparisonData {
  ai: {
    time_minutes: number;
    bar_percentage: number;
    color: string;
  };
  human: {
    time_minutes: number;
    bar_percentage: number;
    color: string;
  };
  difference: {
    minutes: number;
    times_faster: number;
  };
}

// ============================================
// 4. get_attendants_ranking
// ============================================

export interface AttendantRanking {
  position: number;
  id: string;
  name: string;
  avatar_url: string | null;
  conversations: number;
  avg_time_minutes: number;
  converted: number;
  conversion_rate: number;
}

export interface AttendantsRankingData {
  attendants: AttendantRanking[];
}

// ============================================
// 5. get_conversations_detailed_stats (Tudo junto)
// ============================================

export interface ConversationsDetailedStatsData {
  summary: ConversationsSummaryData;
  distribution: AiVsHumanDistributionData;
  response_time: ResponseTimeComparisonData;
  attendants: AttendantsRankingData;
}
