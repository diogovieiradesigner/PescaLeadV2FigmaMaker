import { useState } from 'react';
import { 
  Target, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Sun, 
  Moon, 
  ArrowUp, 
  ArrowDown,
  MessageSquare,
  UserPlus,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Bot,
  Megaphone,
  BarChart3,
  Zap,
  Timer,
  Activity,
  Phone,
  Mail,
  Globe,
  Send,
  ThumbsUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { ProfileMenu } from './ProfileMenu';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { OverviewTab } from './dashboard/OverviewTab';
import { LeadsTab } from './dashboard/LeadsTab';
import { ConversationsTab } from './dashboard/ConversationsTab';
import { CampaignsTab } from './dashboard/CampaignsTab';
import { AITab } from './dashboard/AITab';
import { cn } from './ui/utils';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface DashboardViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  stats?: {
    totalDeals: number;
    totalValue: number;
    activeLeads: number;
    conversionRate: number;
  };
}

export function DashboardView({ theme, onThemeToggle, onNavigateToSettings, stats: propStats }: DashboardViewProps) {
  const isDark = theme === 'dark';

  // Usar stats recebidas como props ou valores padrão
  const stats = propStats || {
    totalDeals: 0,
    totalValue: 0,
    activeLeads: 0,
    conversionRate: 0,
  };

  // Dados de atividade recente
  const recentActivity = [
    {
      id: 1,
      type: 'lead',
      title: 'Novo lead capturado',
      description: 'João Silva manifestou interesse em conhecer os produtos',
      time: '2 min atrás',
      icon: UserPlus,
      badge: 'NOVO LEAD',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    {
      id: 2,
      type: 'message',
      title: 'Nova mensagem recebida',
      description: 'Maria Santos enviou uma pergunta sobre preços',
      time: '15 min atrás',
      icon: MessageSquare,
      badge: 'WHATSAPP',
      badgeColor: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    {
      id: 3,
      type: 'conversion',
      title: 'Lead convertido',
      description: 'Carlos Oliveira fechou negócio de R$ 15.000',
      time: '1h atrás',
      icon: Award,
      badge: 'GANHO',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    {
      id: 4,
      type: 'qualification',
      title: 'Lead qualificado',
      description: 'Ana Costa movida para etapa de Proposta',
      time: '2h atrás',
      icon: CheckCircle2,
      badge: 'QUALIFICADO',
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    {
      id: 5,
      type: 'reminder',
      title: 'Lembrete de follow-up',
      description: 'Retornar contato com Pedro Alves hoje às 15h',
      time: '3h atrás',
      icon: Clock,
      badge: 'FOLLOW-UP',
      badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    },
  ];

  // Pipeline stages data com cores vibrantes
  const pipelineData = [
    { 
      name: 'Novos Leads', 
      value: stats.activeLeads || 12, 
      color: '#3B82F6',
      percentage: 100 
    },
    { 
      name: 'Qualificados', 
      value: Math.floor((stats.activeLeads || 12) * 0.6), 
      color: '#8B5CF6',
      percentage: 60 
    },
    { 
      name: 'Proposta', 
      value: Math.floor((stats.activeLeads || 12) * 0.35), 
      color: '#F59E0B',
      percentage: 35 
    },
    { 
      name: 'Fechados', 
      value: stats.totalDeals || 3, 
      color: '#10B981',
      percentage: 25 
    },
  ];

  // Dados mockados removidos - agora a aba Leads usa dados reais do Supabase via LeadsTab

  // Mini chart para card de Leads Ativos (apenas visual/decorativo na aba Overview)
  const leadsChartData = [
    { day: 'Seg', leads: 8 },
    { day: 'Ter', leads: 12 },
    { day: 'Qua', leads: 10 },
    { day: 'Qui', leads: 16 },
    { day: 'Sex', leads: 14 },
    { day: 'Sáb', leads: 18 },
    { day: 'Dom', leads: stats.activeLeads || 15 },
  ];

  // Dados de conversas
  const conversationsData = [
    { day: 'Seg', ai: 45, human: 12 },
    { day: 'Ter', ai: 52, human: 15 },
    { day: 'Qua', ai: 48, human: 10 },
    { day: 'Qui', ai: 65, human: 18 },
    { day: 'Sex', ai: 58, human: 14 },
    { day: 'Sáb', ai: 35, human: 8 },
    { day: 'Dom', ai: 28, human: 5 },
  ];

  // Dados de campanhas
  const campaignsData = [
    { name: 'Black Friday', sent: 450, opened: 380, clicked: 120, converted: 45 },
    { name: 'Lançamento', sent: 320, opened: 280, clicked: 95, converted: 32 },
    { name: 'Follow-up', sent: 280, opened: 220, clicked: 75, converted: 28 },
    { name: 'Reengajamento', sent: 180, opened: 145, clicked: 48, converted: 15 },
  ];

  // Ranking de atendentes
  const attendantsRanking = [
    { name: 'Maria Silva', conversations: 145, avgTime: '2m 30s', satisfaction: 4.8 },
    { name: 'João Costa', conversations: 132, avgTime: '3m 15s', satisfaction: 4.6 },
    { name: 'Ana Santos', conversations: 118, avgTime: '2m 45s', satisfaction: 4.7 },
    { name: 'Carlos Oliveira', conversations: 98, avgTime: '3m 50s', satisfaction: 4.5 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className={cn(
        "h-16 border-b flex items-center justify-between px-6 transition-colors",
        isDark 
          ? "bg-black border-white/[0.08]" 
          : "bg-white border-zinc-200"
      )}>
        <div>
          <h1 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-zinc-900")}>
            Dashboard
          </h1>
          <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
            Visão geral do seu CRM
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={onThemeToggle}
            className={cn(
              "h-9 w-9 rounded-lg transition-colors flex items-center justify-center",
              isDark 
                ? "hover:bg-white/10 text-white/70 hover:text-white" 
                : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
            )}
            title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* User Profile */}
          <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
        </div>
      </header>

      {/* Content com Tabs */}
      <div className={cn(
        "flex-1 overflow-hidden",
        isDark ? "bg-black" : "bg-zinc-50"
      )}>
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          {/* Tabs Navigation */}
          <div className={cn(
            "px-6 pt-6 pb-4 mb-4 border-b",
            isDark ? "border-white/[0.08]" : "border-zinc-200"
          )}>
            <TabsList className={cn(
              "inline-flex justify-start rounded-lg p-1 h-auto",
              isDark ? "bg-white/[0.05]" : "bg-zinc-100"
            )}>
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-2">
                <Users className="w-4 h-4" />
                Leads
              </TabsTrigger>
              <TabsTrigger value="conversations" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversas
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2">
                <Megaphone className="w-4 h-4" />
                Campanhas
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Bot className="w-4 h-4" />
                I.A & Automação
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {/* ABA 1: 📊 Visão Geral */}
            <TabsContent value="overview" className="m-0 p-6">
              <OverviewTab isDark={isDark} />
            </TabsContent>

            {/* ABA 2: 👥 Leads */}
            <TabsContent value="leads" className="m-0 p-6">
              <LeadsTab isDark={isDark} />
            </TabsContent>

            {/* ABA 3: 💬 Conversas */}
            <TabsContent value="conversations" className="m-0 p-6">
              <ConversationsTab isDark={isDark} />
            </TabsContent>

            {/* ABA 4: 📢 Campanhas */}
            <TabsContent value="campaigns" className="m-0 p-6">
              <CampaignsTab isDark={isDark} />
            </TabsContent>

            {/* ABA 5: 🤖 I.A & Automação */}
            <TabsContent value="ai" className="m-0 p-6">
              <AITab isDark={isDark} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
