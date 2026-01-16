import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';

interface Campaign {
  position: number;
  id: string;
  name: string;
  sent: number;
  responses: number;
  response_rate: number;
}

interface CampaignsRankingProps {
  isDark: boolean;
  campaigns: Campaign[];
}

export function CampaignsRanking({ isDark, campaigns }: CampaignsRankingProps) {
  const getMedal = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return <span className={cn("text-sm font-medium", isDark ? "text-zinc-500" : "text-zinc-600")}>{position}º</span>;
    }
  };

  const getRateColor = (rate: number) => {
    if (rate >= 30) return isDark ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-700 border-green-300';
    if (rate >= 20) return isDark ? 'bg-lime-500/20 text-lime-400 border-lime-500/30' : 'bg-lime-100 text-lime-700 border-lime-300';
    if (rate >= 10) return isDark ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-700 border-red-300';
  };

  return (
    <Card className={cn(
      "rounded-xl",
      isDark 
        ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
        : "bg-white border border-zinc-200"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className={cn("w-5 h-5", isDark ? "text-yellow-500" : "text-yellow-600")} />
          <CardTitle className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            Ranking de Campanhas (Top 10)
          </CardTitle>
        </div>
        <p className={cn(
          "text-sm",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Ordenado por taxa de resposta
        </p>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className={cn(
                "text-xs border-b",
                isDark ? "text-zinc-500 border-zinc-800" : "text-zinc-600 border-zinc-200"
              )}>
                <th className="text-left py-3 font-medium">POSIÇÃO</th>
                <th className="text-left py-3 font-medium">CAMPANHA</th>
                <th className="text-right py-3 font-medium">ENVIADAS</th>
                <th className="text-right py-3 font-medium">RESPOSTAS</th>
                <th className="text-right py-3 font-medium">TAXA RESP.</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr 
                  key={campaign.id} 
                  className={cn(
                    "border-b transition-colors",
                    isDark 
                      ? "border-zinc-800/50 hover:bg-zinc-800/30" 
                      : "border-zinc-100 hover:bg-zinc-50"
                  )}
                >
                  <td className="py-4">
                    <span className="text-2xl">{getMedal(campaign.position)}</span>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "font-medium",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {campaign.name}
                    </span>
                  </td>
                  <td className={cn(
                    "py-4 text-right",
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  )}>
                    {campaign.sent.toLocaleString()}
                  </td>
                  <td className={cn(
                    "py-4 text-right",
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  )}>
                    {campaign.responses.toLocaleString()}
                  </td>
                  <td className="py-4 text-right">
                    <Badge className={cn("border", getRateColor(campaign.response_rate))}>
                      {campaign.response_rate.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {campaigns.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className={cn(
                "text-sm",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}>
                Nenhuma campanha encontrada no período
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
