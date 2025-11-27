import { Theme } from '../hooks/useTheme';
import { Megaphone, Plus, Users, Send, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface CampaignViewProps {
  theme: Theme;
}

export function CampaignView({ theme }: CampaignViewProps) {
  const isDark = theme === 'dark';

  const campaigns = [
    { id: 1, name: 'Promoção Black Friday', status: 'active', sent: 1250, delivered: 1180, opened: 890, clicks: 420 },
    { id: 2, name: 'Lançamento Produto', status: 'scheduled', sent: 0, delivered: 0, opened: 0, clicks: 0 },
    { id: 3, name: 'Newsletter Semanal', status: 'completed', sent: 3420, delivered: 3280, opened: 2150, clicks: 980 },
  ];

  return (
    <div className={`h-screen flex flex-col transition-colors ${
      isDark ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-border-light'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Campanhas
            </h1>
            <p className={`text-sm mt-1 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}>
              Crie e gerencie campanhas de mensagens em massa
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0169D9] hover:bg-[#0169D9]/90 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Total Enviadas
                </p>
                <p className={`text-2xl mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  4,670
                </p>
              </div>
              <Send className="w-8 h-8 text-[#0169D9]" />
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Taxa de Entrega
                </p>
                <p className={`text-2xl mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  95.8%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Taxa de Abertura
                </p>
                <p className={`text-2xl mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  68.2%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Taxa de Cliques
                </p>
                <p className={`text-2xl mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  31.5%
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className={`rounded-lg border ${
          isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
        }`}>
          <div className="p-6 border-b border-white/[0.08]">
            <h2 className={`text-lg ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Todas as Campanhas
            </h2>
          </div>

          <div className="divide-y divide-white/[0.08]">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
                    }`}>
                      <Megaphone className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
                    </div>
                    <div>
                      <h3 className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {campaign.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {campaign.status === 'active' && (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Ativa
                          </span>
                        )}
                        {campaign.status === 'scheduled' && (
                          <span className="flex items-center gap-1 text-xs text-blue-500">
                            <Clock className="w-3 h-3" />
                            Agendada
                          </span>
                        )}
                        {campaign.status === 'completed' && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <CheckCircle className="w-3 h-3" />
                            Concluída
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isDark 
                      ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white' 
                      : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
                  }`}>
                    Ver Detalhes
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Enviadas
                    </p>
                    <p className={`text-lg mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {campaign.sent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Entregues
                    </p>
                    <p className={`text-lg mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {campaign.delivered.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Abertas
                    </p>
                    <p className={`text-lg mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {campaign.opened.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Cliques
                    </p>
                    <p className={`text-lg mt-1 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {campaign.clicks.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
