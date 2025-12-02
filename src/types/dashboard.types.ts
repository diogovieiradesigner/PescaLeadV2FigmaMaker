// ============================================
// TIPOS PARA O DASHBOARD ANALYTICS
// ============================================

// Filtros do Dashboard
export interface DashboardFilters {
  startDate: Date;
  endDate: Date;
  funnelId?: string;
  funnelFilter?: 'all' | 'inbound' | 'outbound';
}

// Cards Principais
export interface DashboardCard {
  value: number;
  previous: number;
  change_percent: number;
}

export interface DashboardCards {
  leads: DashboardCard;
  conversations: DashboardCard;
  messages: DashboardCard;
  economy_hours: DashboardCard;
}

// Breakdown de Conversas
export interface ConversationsBreakdown {
  total: number;
  ai: number;
  human: number;
  resolved: number;
  ai_percentage: number;
}

// Breakdown de Mensagens
export interface MessagesBreakdown {
  total: number;
  sent: number;
  received: number;
  by_ai: number;
  by_human: number;
  ai_percentage: number;
}

// Follow-ups
export interface FollowupsData {
  created: number;
  sent: number;
  with_response: number;
  response_rate: number;
}

// Resposta completa do get_dashboard_summary
export interface DashboardSummary {
  period: {
    start: string;
    end: string;
    days: number;
    comparison_start: string;
    comparison_end: string;
  };
  cards: DashboardCards;
  conversations_breakdown: ConversationsBreakdown;
  messages_breakdown: MessagesBreakdown;
  followups: FollowupsData;
  generated_at: string;
}

// Leads por Canal (Gráfico Pizza)
export interface ChannelChartItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface LeadsByChannel {
  total: number;
  channels: Record<string, number>;
  chart_data: ChannelChartItem[];
}

// Funil de Conversão
export interface FunnelColumn {
  column_id: string;
  title: string;
  position: number;
  color: string;
  count: number;
}

export interface ConversionRate {
  from_position: number;
  to_position: number;
  from_title: string;
  to_title: string;
  from_count: number;
  to_count: number;
  rate: number;
}

export interface FunnelAnalytics {
  funnel_id: string;
  period: { start: string; end: string };
  columns: FunnelColumn[];
  conversion_rates: ConversionRate[];
  summary: {
    total_first_stage: number;
    total_last_stage: number;
    total_conversion_rate: number;
  };
  generated_at: string;
}

// Heatmap de Engajamento
export interface HeatmapCell {
  value: number;
  percentage: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapData {
  [dayOfWeek: string]: {
    [hour: string]: HeatmapCell;
  };
}

export interface BestSlot {
  dow: number;
  dow_name: string;
  hour: number;
  hour_range: string;
  value: number;
}

export interface EngagementHeatmap {
  heatmap: HeatmapData;
  best_slot: BestSlot | null;
  max_value: number;
  legend: Array<{ level: number; label: string; color: string }>;
  days: string[];
  hours: string[];
  insight: string;
  generated_at: string;
}

// Rankings
export interface LeadEngaged {
  position: number;
  id: string;
  name: string;
  company: string;
  messages: number;
  conversation_id: string;
}

export interface Attendant {
  position: number;
  id: string;
  name: string;
  avatar_url: string;
  conversations: number;
  avg_time_minutes: number;
  resolved: number;
  resolution_rate: number;
}

export interface Source {
  position: number;
  source: string;
  source_type: 'extraction' | 'manual';
  leads: number;
  extraction_id: string;
}

export interface Campaign {
  position: number;
  id: string;
  name: string;
  total_leads: number;
  leads_with_response: number;
  response_rate: number;
}

export interface TopRankings {
  leads_engaged: LeadEngaged[];
  attendants: Attendant[];
  sources: Source[];
  campaigns: Campaign[];
  period: { start: string; end: string };
  limit: number;
  generated_at: string;
}
