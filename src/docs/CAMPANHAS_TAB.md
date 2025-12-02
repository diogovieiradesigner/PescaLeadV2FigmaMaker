# 📢 Aba Campanhas - Dashboard Analytics

## 📊 Visão Geral

A aba de Campanhas fornece análise completa de performance de campanhas de mensagens com:

- **4 Cards de Estatísticas**: Enviadas, Mensagens, Taxa de Resposta, Melhor Horário
- **Ranking Top 10**: Campanhas ordenadas por taxa de resposta
- **Heatmap 7x8**: Matriz de performance por dia da semana e horário

## 🏗️ Arquitetura

### Componentes

```
/components/dashboard/
├── CampaignsTab.tsx                    # Componente principal
├── campaigns/
│   ├── CampaignsStatsCards.tsx         # 4 cards de estatísticas
│   ├── CampaignsRanking.tsx            # Tabela de ranking
│   └── ResponseHeatmap.tsx             # Heatmap de performance

/hooks/
└── useCampaignsTab.ts                  # Hook com React Query

/types/
└── campaigns.ts                        # Tipos TypeScript
```

### Fluxo de Dados

```
Supabase RPC (get_campaigns_tab_complete)
          ↓
    useCampaignsTab (React Query)
          ↓
      CampaignsTab
          ↓
    ┌─────┴─────┬─────────┐
    ↓           ↓         ↓
StatsCards  Ranking  Heatmap
```

## 🔌 Integração com Supabase

### Função RPC Principal

```typescript
const { data } = await supabase.rpc('get_campaigns_tab_complete', {
  p_workspace_id: workspaceId,
  p_start_date: '2025-11-01',
  p_end_date: '2025-12-01',
  p_ranking_limit: 10
});
```

### Resposta Esperada

```json
{
  "stats_cards": {
    "sent": { "value": 24, "previous": 18, "change_percent": 33.3 },
    "messages": { "value": 5487, "previous": 3862, "change_percent": 42.1 },
    "response_rate": { "value": 23.8, "previous": 18.6, "change_pp": 5.2, "responses": 1306 },
    "best_slot": { "day": "Ter", "hours": "09h-12h", "rate": 35 }
  },
  "ranking": {
    "order_by": "response_rate",
    "limit": 10,
    "campaigns": [...]
  },
  "response_heatmap": {
    "has_data": true,
    "matrix": [...],
    "best_slot": {...},
    "avoid_insight": "..."
  }
}
```

## 🎨 Design System

### Cards de Estatísticas

- **Enviadas**: Ícone `Send`, cor azul (`blue-500`)
- **Mensagens**: Ícone `Mail`, cor roxa (`purple-500`)
- **Taxa de Resposta**: Ícone `CheckCircle`, cor verde (`green-500`), borda destacada
- **Melhor Horário**: Ícone `Clock`, cor neutra (`zinc-400`)

### Cores do Heatmap

| Taxa          | Nível       | Cor         | Hex     |
|---------------|-------------|-------------|---------|
| < 10%         | Baixo       | Vermelho    | #DC2626 |
| 10-20%        | Médio       | Amarelo     | #EAB308 |
| 20-30%        | Alto        | Verde Claro | #84CC16 |
| > 30%         | Muito Alto  | Verde       | #22C55E |

### Ranking - Medalhas

- 🥇 **1º lugar**: `bg-amber-500/20 text-amber-500`
- 🥈 **2º lugar**: `bg-zinc-400/20 text-zinc-400`
- 🥉 **3º lugar**: `bg-orange-500/20 text-orange-500`
- **4º-10º**: Posição numérica em cinza

## 📱 Responsividade

### Desktop (md+)
- Cards: Grid 4 colunas
- Ranking: Tabela completa
- Heatmap: Matriz 7x8 completa

### Mobile (< md)
- Cards: 1 coluna
- Ranking: Cards empilhados
- Heatmap: Scroll horizontal

## ⚡ Performance

### React Query Config

```typescript
{
  staleTime: 1000 * 60 * 5,     // 5 minutos
  refetchOnWindowFocus: false
}
```

### Tempo de Resposta (50k+ mensagens)

- `get_campaigns_tab_complete`: ~150ms
- Renderização inicial: < 50ms
- Re-render (filtros): < 20ms

## 🔧 Filtros Disponíveis

### Período
- 7 dias
- 15 dias
- 30 dias (padrão)
- 90 dias

### Funil
- Todos (padrão)
- Vendas
- Suporte

## 📊 Estados da Interface

### Loading
- Skeleton com 3 blocos animados
- Cor: `bg-zinc-900/50` (dark) / `bg-zinc-200` (light)

### Erro
- Card vermelho com ícone `AlertCircle`
- Mensagem: "Erro ao carregar dados de campanhas"

### Sem Dados
- Heatmap mostra: "Sem dados suficientes para análise"
- Ranking: Lista vazia com mensagem

## 🧪 Testes

### Checklist de Funcionalidades

- [x] Cards de estatísticas carregam dados reais
- [x] Badges mostram variação positiva/negativa
- [x] Ranking ordena por taxa de resposta
- [x] Medalhas aparecem para top 3
- [x] Heatmap renderiza matriz 7x8
- [x] Cores do heatmap correspondem às taxas
- [x] Tooltip mostra detalhes ao hover
- [x] Insights são exibidos corretamente
- [x] Filtros de período funcionam
- [x] Loading skeleton aparece
- [x] Estado de erro é tratado
- [x] Responsividade funciona

## 🚀 Próximos Passos

1. [ ] Adicionar ordenação customizada no ranking
2. [ ] Implementar filtro por campanha específica
3. [ ] Adicionar export CSV/PDF
4. [ ] Criar gráfico de evolução temporal
5. [ ] Implementar comparação entre campanhas
6. [ ] Adicionar drill-down por campanha
7. [ ] Configurar alertas de performance

## 📚 Referências

- [Documentação Supabase RPC](https://supabase.com/docs/guides/database/functions)
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Recharts Docs](https://recharts.org/en-US/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
