import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Trophy } from 'lucide-react';
import { Campaign } from '../../types/dashboard.types';
import { cn } from '../ui/utils';

interface TopCampaignsProps {
  campaigns: Campaign[];
  isLoading?: boolean;
  isDark?: boolean;
}

export function TopCampaigns({ campaigns, isLoading, isDark = true }: TopCampaignsProps) {
  if (isLoading) {
    return <div className="animate-pulse bg-zinc-800 h-96 rounded-xl" />;
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-yellow-500 text-yellow-950';
      case 2: return 'bg-zinc-400 text-zinc-950';
      case 3: return 'bg-amber-600 text-amber-950';
      default: return 'bg-zinc-600 text-zinc-200';
    }
  };

  const getResponseBadgeColor = (rate: number) => {
    if (rate >= 30) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (rate >= 20) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (rate >= 10) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  return (
    <Card className={cn(
      "rounded-xl",
      isDark 
        ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
        : "bg-white border border-zinc-200"
    )}>
      <CardHeader className="pb-4">
        <CardTitle className={cn(
          "text-xs font-medium uppercase tracking-wider flex items-center gap-2",
          isDark ? "text-zinc-500" : "text-zinc-600"
        )}>
          <Trophy className="w-4 h-4 text-yellow-500" />
          TOP 5 EXTRAÇÕES
        </CardTitle>
        <p className={cn(
          "text-sm mt-1",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Por taxa de resposta
        </p>
      </CardHeader>

      <CardContent className="pb-6 space-y-3">
        {campaigns.length === 0 ? (
          <p className={cn("text-sm text-center py-8", isDark ? "text-zinc-500" : "text-zinc-600")}>
            Nenhuma campanha no período
          </p>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                isDark 
                  ? "bg-white/[0.02] hover:bg-white/[0.04]"
                  : "bg-zinc-50 hover:bg-zinc-100"
              )}
            >
              {/* Posição */}
              <span
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  getPositionColor(campaign.position)
                )}
              >
                {campaign.position}
              </span>

              {/* Info da Campanha */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {campaign.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Badge de Taxa */}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium border',
                      getResponseBadgeColor(campaign.response_rate)
                    )}
                  >
                    {campaign.response_rate.toFixed(1)}% resposta
                  </span>
                  {/* Total de envios */}
                  <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-zinc-600")}>
                    · {campaign.total_leads} envios
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}