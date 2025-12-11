// Tipos para a Aba de Campanhas

export interface CampaignStatsCards {
  sent: {
    value: number;
    previous: number;
    change_percent: number;
  };
  messages: {
    value: number;
    previous: number;
    change_percent: number;
  };
  response_rate: {
    value: number;
    previous: number;
    change_pp: number;
    responses: number;
  };
  best_slot: {
    day: string;
    hours: string;
    rate: number;
  };
  period: {
    start: string;
    end: string;
    comparison_start: string;
    comparison_end: string;
  };
}

export interface Campaign {
  position: number;
  id: string;
  name: string;
  sent: number;
  responses: number;
  response_rate: number;
}

export interface CampaignsRanking {
  order_by: string;
  limit: number;
  campaigns: Campaign[];
}

export interface HeatmapSlot {
  hour: string;
  hour_idx: number;
  rate: number;
  sent: number;
  received: number;
  level: 'low' | 'medium' | 'high' | 'very_high';
  color: string;
}

export interface HeatmapDay {
  day: string;
  day_idx: number;
  slots: HeatmapSlot[];
}

export interface ResponseHeatmap {
  has_data: boolean;
  matrix: HeatmapDay[];
  best_slot: {
    day: string;
    hours: string;
    rate: number;
    insight: string;
  };
  avoid_insight: string;
  legend: Array<{ label: string; color: string }>;
}

export interface CampaignsTabCompleteData {
  stats_cards: CampaignStatsCards;
  ranking: CampaignsRanking;
  response_heatmap: ResponseHeatmap;
}
