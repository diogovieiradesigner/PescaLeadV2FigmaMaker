import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LeadsByChannel } from '../../types/dashboard.types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';

interface LeadsByChannelChartProps {
  data: LeadsByChannel;
  isLoading?: boolean;
  isDark?: boolean;
}

// Cores padrão para cada canal
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  email: '#FFB800',
  form: '#8B5CF6',
  extraction: '#3B82F6',
  manual: '#6B7280',
  other: '#9CA3AF',
};

// Nomes traduzidos
const CHANNEL_NAMES: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Email',
  form: 'Formulário',
  extraction: 'Extração',
  manual: 'Manual',
  other: 'Outros',
};

export function LeadsByChannelChart({ data, isLoading, isDark = true }: LeadsByChannelChartProps) {
  if (isLoading) {
    return <div className="animate-pulse bg-zinc-800 h-96 rounded-xl" />;
  }

  // Preparar dados para o gráfico - usando apenas chart_data da RPC
  const chartData = data.chart_data || [];

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className={cn(
          "rounded-lg p-3 shadow-lg border",
          isDark 
            ? "bg-zinc-800 border-zinc-700" 
            : "bg-white border-zinc-200"
        )}>
          <p className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>
            {item.name}
          </p>
          <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-600")}>
            {item.value.toLocaleString('pt-BR')} leads ({item.percentage}%)
          </p>
        </div>
      );
    }
    return null;
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
          "text-xs font-medium uppercase tracking-wider",
          isDark ? "text-zinc-500" : "text-zinc-600"
        )}>
          📊 Leads por Canal
        </CardTitle>
        <p className={cn(
          "text-sm mt-1",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Distribuição por canal de entrada
        </p>
      </CardHeader>

      <CardContent className="pb-6">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-zinc-600")}>
              Nenhum dado disponível
            </p>
          </div>
        ) : (
          <>
            {/* Gráfico de Donut */}
            <div className="flex items-center justify-center mb-6 w-full" style={{ height: '200px', minHeight: '200px' }}>
              <ResponsiveContainer width="100%" height={200} minHeight={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda */}
            <div className="grid grid-cols-2 gap-4">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {item.name}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      {item.value.toLocaleString('pt-BR')} ({item.percentage}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <Separator className={cn(
              "my-4",
              isDark ? "bg-white/[0.08]" : "bg-zinc-200"
            )} />
            <p className={cn(
              "text-sm font-medium text-center",
              isDark ? "text-zinc-400" : "text-zinc-600"
            )}>
              Total: {data.total.toLocaleString('pt-BR')} leads
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}