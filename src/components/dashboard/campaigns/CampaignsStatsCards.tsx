import { Send, Mail, CheckCircle, Clock, ArrowUp, ArrowDown, Flag, MessageSquare, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';

interface StatsCardsProps {
  isDark: boolean;
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
  responseRate: {
    value: number;
    change_pp: number;
    responses: number;
  };
  bestSlot: {
    day: string;
    hours: string;
    rate: number;
  };
}

export function CampaignsStatsCards({ 
  isDark, 
  sent, 
  messages, 
  responseRate, 
  bestSlot 
}: StatsCardsProps) {
  const isPositiveSent = sent.change_percent >= 0;
  const isPositiveMessages = messages.change_percent >= 0;
  const isPositiveRate = responseRate.change_pp >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Card: Enviadas */}
      <Card className={cn(
        "rounded-xl border-0",
        isDark 
          ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
          : "bg-white border border-zinc-200"
      )}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-lg",
              isDark ? "bg-blue-500/10" : "bg-blue-50"
            )}>
              <Send className={cn(
                "w-5 h-5",
                isDark ? "text-blue-400" : "text-blue-600"
              )} />
            </div>
            <Badge className={cn(
              "gap-1 border",
              isPositiveSent
                ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
            )}>
              {isPositiveSent ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{Math.abs(sent.change_percent).toFixed(1)}%</span>
            </Badge>
          </div>
          <p className={cn(
            "text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            <Flag className="w-3.5 h-3.5" /> Enviadas
          </p>
          <p className={cn(
            "text-3xl font-bold",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            {sent.value.toLocaleString()}
          </p>
          <p className={cn(
            "text-xs mt-2",
            isDark ? "text-zinc-600" : "text-zinc-500"
          )}>
            vs período anterior
          </p>
        </CardContent>
      </Card>

      {/* Card: Mensagens */}
      <Card className={cn(
        "rounded-xl border-0",
        isDark 
          ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
          : "bg-white border border-zinc-200"
      )}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-lg",
              isDark ? "bg-purple-500/10" : "bg-purple-50"
            )}>
              <Mail className={cn(
                "w-5 h-5",
                isDark ? "text-purple-400" : "text-purple-600"
              )} />
            </div>
            <Badge className={cn(
              "gap-1 border",
              isPositiveMessages
                ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
            )}>
              {isPositiveMessages ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{Math.abs(messages.change_percent).toFixed(1)}%</span>
            </Badge>
          </div>
          <p className={cn(
            "text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            <MessageSquare className="w-3.5 h-3.5" /> Mensagens
          </p>
          <p className={cn(
            "text-3xl font-bold",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            {messages.value.toLocaleString()}
          </p>
          <p className={cn(
            "text-xs mt-2",
            isDark ? "text-zinc-600" : "text-zinc-500"
          )}>
            vs período anterior
          </p>
        </CardContent>
      </Card>

      {/* Card: Taxa de Resposta */}
      <Card className={cn(
        "rounded-xl border-0",
        isDark 
          ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-green-500/30" 
          : "bg-white border border-green-200"
      )}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-lg",
              isDark ? "bg-green-500/10" : "bg-green-50"
            )}>
              <CheckCircle className={cn(
                "w-5 h-5",
                isDark ? "text-green-400" : "text-green-600"
              )} />
            </div>
            <Badge className={cn(
              "gap-1 border",
              isPositiveRate
                ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
            )}>
              {isPositiveRate ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{Math.abs(responseRate.change_pp).toFixed(1)}pp</span>
            </Badge>
          </div>
          <p className={cn(
            "text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            <CheckSquare className={cn("w-3.5 h-3.5", isDark ? "text-green-400" : "text-green-600")} /> Taxa Resp.
          </p>
          <p className={cn(
            "text-3xl font-bold",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            {responseRate.value.toFixed(1)}%
          </p>
          <p className={cn(
            "text-xs mt-2",
            isDark ? "text-zinc-600" : "text-zinc-500"
          )}>
            {responseRate.responses.toLocaleString()} respostas
          </p>
        </CardContent>
      </Card>

      {/* Card: Melhor Horário */}
      <Card className={cn(
        "rounded-xl border-0",
        isDark 
          ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
          : "bg-white border border-zinc-200"
      )}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-lg",
              isDark ? "bg-zinc-700/50" : "bg-zinc-100"
            )}>
              <Clock className={cn(
                "w-5 h-5",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )} />
            </div>
          </div>
          <p className={cn(
            "text-xs font-medium uppercase tracking-wider mb-2 flex items-center gap-2",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            <span className="w-2 h-2 rounded-full bg-green-500" /> Melhor HR
          </p>
          <p className={cn(
            "text-2xl font-bold",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            {bestSlot.day}, {bestSlot.hours}
          </p>
          <p className={cn(
            "text-xs mt-2",
            isDark ? "text-zinc-600" : "text-zinc-500"
          )}>
            {bestSlot.rate}% de resposta
          </p>
        </CardContent>
      </Card>
    </div>
  );
}