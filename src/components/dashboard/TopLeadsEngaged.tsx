import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LeadEngaged } from '../../types/dashboard.types';
import { Flame, MessageSquare } from 'lucide-react';
import { cn } from '../ui/utils';

interface TopLeadsEngagedProps {
  leads: LeadEngaged[];
  onOpenConversation?: (conversationId: string) => void;
  isLoading?: boolean;
  isDark?: boolean;
}

export function TopLeadsEngaged({ 
  leads, 
  onOpenConversation,
  isLoading,
  isDark = true
}: TopLeadsEngagedProps) {
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

  const getMessagesColor = (messages: number) => {
    if (messages >= 80) return 'text-green-400';
    if (messages >= 50) return 'text-yellow-400';
    if (messages >= 30) return 'text-orange-400';
    return isDark ? 'text-zinc-400' : 'text-zinc-600';
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
          <Flame className="w-4 h-4 text-orange-500" />
          TOP 5 LEADS MAIS ENGAJADOS
        </CardTitle>
        <p className={cn(
          "text-sm mt-1",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Por número de mensagens
        </p>
      </CardHeader>

      <CardContent className="pb-6 space-y-3">
        {leads.length === 0 ? (
          <p className={cn("text-sm text-center py-8", isDark ? "text-zinc-500" : "text-zinc-600")}>
            Nenhum lead com mensagens no período
          </p>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-colors",
                isDark 
                  ? "bg-white/[0.02] hover:bg-white/[0.04]"
                  : "bg-zinc-50 hover:bg-zinc-100"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Posição */}
                <span
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                    getPositionColor(lead.position)
                  )}
                >
                  {lead.position}
                </span>

                {/* Info do Lead */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    {lead.name}
                  </p>
                  {lead.company && (
                    <p className={cn(
                      "text-xs truncate",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      {lead.company}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <MessageSquare className={cn(
                      "w-3 h-3",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )} />
                    <span className={cn('text-sm font-medium', getMessagesColor(lead.messages))}>
                      {lead.messages}
                    </span>
                    <span className={cn(
                      "text-xs",
                      isDark ? "text-zinc-600" : "text-zinc-500"
                    )}>
                      mensagens trocadas
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Ação */}
              {lead.conversation_id && onOpenConversation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenConversation(lead.conversation_id)}
                  className="text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300 shrink-0 ml-2"
                >
                  Abrir conversa
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}