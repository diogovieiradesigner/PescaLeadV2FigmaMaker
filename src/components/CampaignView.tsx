import { useState } from 'react';
import { Theme } from '../hooks/useTheme';
import { 
  Calendar, 
  Clock, 
  Users, 
  MessageSquare, 
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Save,
  Loader2
} from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

interface CampaignViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
}

interface CampaignHistory {
  id: number;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  leadsRequested: number;
  leadsWithPhone: number;
  leadsWithPhonePercent: number;
  leadsSent: number;
  leadsSentPercent: number;
  responseRate: number;
  responses: number;
  sources: {
    googleMaps: { count: number; percent: number };
    cnpj: { count: number; percent: number };
  };
  locations: {
    name: string;
    percent: number;
  }[];
  reportSent: string;
}

export function CampaignView({ theme, onThemeToggle, onNavigateToSettings }: CampaignViewProps) {
  const isDark = theme === 'dark';

  // Estados para configuração
  const [campaignActive, setCampaignActive] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekly'>('daily');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:30');
  const [leadsPerDay, setLeadsPerDay] = useState(100);
  const [aiInstructions, setAiInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dados mockados - Histórico de campanhas
  const campaignHistory: CampaignHistory[] = [
    {
      id: 1,
      name: 'Campanha - Academias SP',
      date: '21/10/2025',
      startTime: '09:00',
      endTime: '14:30',
      duration: '5h30',
      leadsRequested: 100,
      leadsWithPhone: 97,
      leadsWithPhonePercent: 97,
      leadsSent: 95,
      leadsSentPercent: 98,
      responseRate: 23,
      responses: 22,
      sources: {
        googleMaps: { count: 68, percent: 70 },
        cnpj: { count: 29, percent: 30 }
      },
      locations: [
        { name: 'São Paulo - Zona Sul', percent: 45 },
        { name: 'São Paulo - Zona Oeste', percent: 35 },
        { name: 'São Paulo - Outras', percent: 20 }
      ],
      reportSent: '14:45'
    },
    {
      id: 2,
      name: 'Campanha - Academias SP',
      date: '20/10/2025',
      startTime: '09:00',
      endTime: '15:15',
      duration: '6h15',
      leadsRequested: 100,
      leadsWithPhone: 94,
      leadsWithPhonePercent: 94,
      leadsSent: 92,
      leadsSentPercent: 98,
      responseRate: 19,
      responses: 17,
      sources: {
        googleMaps: { count: 71, percent: 75 },
        cnpj: { count: 23, percent: 25 }
      },
      locations: [
        { name: 'São Paulo - Zona Sul', percent: 42 },
        { name: 'São Paulo - Zona Oeste', percent: 38 },
        { name: 'São Paulo - Outras', percent: 20 }
      ],
      reportSent: '15:30'
    },
    {
      id: 3,
      name: 'Campanha - Academias SP',
      date: '19/10/2025',
      startTime: '09:00',
      endTime: '14:45',
      duration: '5h45',
      leadsRequested: 100,
      leadsWithPhone: 98,
      leadsWithPhonePercent: 98,
      leadsSent: 96,
      leadsSentPercent: 98,
      responseRate: 25,
      responses: 24,
      sources: {
        googleMaps: { count: 65, percent: 68 },
        cnpj: { count: 31, percent: 32 }
      },
      locations: [
        { name: 'São Paulo - Zona Sul', percent: 48 },
        { name: 'São Paulo - Zona Oeste', percent: 32 },
        { name: 'São Paulo - Outras', percent: 20 }
      ],
      reportSent: '15:00'
    },
    {
      id: 4,
      name: 'Campanha - Academias RJ',
      date: '18/10/2025',
      startTime: '09:00',
      endTime: '16:00',
      duration: '7h00',
      leadsRequested: 120,
      leadsWithPhone: 115,
      leadsWithPhonePercent: 96,
      leadsSent: 112,
      leadsSentPercent: 97,
      responseRate: 21,
      responses: 24,
      sources: {
        googleMaps: { count: 82, percent: 73 },
        cnpj: { count: 30, percent: 27 }
      },
      locations: [
        { name: 'Rio de Janeiro - Zona Sul', percent: 55 },
        { name: 'Rio de Janeiro - Zona Norte', percent: 30 },
        { name: 'Rio de Janeiro - Outras', percent: 15 }
      ],
      reportSent: '16:15'
    },
    {
      id: 5,
      name: 'Campanha - Academias SP',
      date: '17/10/2025',
      startTime: '09:00',
      endTime: '14:20',
      duration: '5h20',
      leadsRequested: 100,
      leadsWithPhone: 96,
      leadsWithPhonePercent: 96,
      leadsSent: 94,
      leadsSentPercent: 98,
      responseRate: 18,
      responses: 17,
      sources: {
        googleMaps: { count: 69, percent: 72 },
        cnpj: { count: 27, percent: 28 }
      },
      locations: [
        { name: 'São Paulo - Zona Sul', percent: 43 },
        { name: 'São Paulo - Zona Oeste', percent: 37 },
        { name: 'São Paulo - Outras', percent: 20 }
      ],
      reportSent: '14:35'
    }
  ];

  // Calcular intervalo disponível
  const calculateInterval = () => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    if (totalMinutes > 0 && leadsPerDay > 0) {
      const intervalPerLead = totalMinutes / leadsPerDay;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}min (${intervalPerLead.toFixed(1)} min/lead)`;
    }
    return '0h 0min';
  };

  // Paginação
  const totalPages = Math.ceil(campaignHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = campaignHistory.slice(startIndex, endIndex);

  return (
    <div className={`h-screen flex flex-col transition-colors ${
      isDark ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      {/* Header */}
      <div className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}>
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className={isDark ? 'text-white' : 'text-text-primary-light'}>
              Campanhas de Prospecção com I.A
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Configure campanhas automáticas de prospecção
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button 
            onClick={onThemeToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-white/[0.05]' 
                : 'hover:bg-light-elevated-hover'
            }`}
            title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-white/50" />
            ) : (
              <Moon className="w-4 h-4 text-text-secondary-light" />
            )}
          </button>

          {/* User Profile */}
          <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Configuration Card */}
          <div className="rounded-lg overflow-hidden">
            <div className={`px-6 py-3.5 border-b flex items-center justify-between ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
                Configuração da Campanha
              </h2>
              
              <div className="flex items-center gap-2">
                <span className={`text-sm ${
                  isDark ? 'text-white/60' : 'text-text-secondary-light'
                }`}>
                  {campaignActive ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={() => setCampaignActive(!campaignActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    campaignActive ? 'bg-green-500' : isDark ? 'bg-white/[0.1]' : 'bg-gray-300'
                  }`}
                  title={campaignActive ? 'Desativar campanha automática' : 'Ativar campanha automática'}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    campaignActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-[rgb(0,0,0)]">
              {/* 2 Caixas Lado a Lado */}
              <div className="grid grid-cols-2 gap-6">
                {/* Seção 1: Parâmetros de Envio */}
                <div>
                  <h3 className={`mb-4 font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    Parâmetros de Envio
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                        Frequência de Envios
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as any)}
                        className={`w-full px-4 py-2 border-b transition-all ${
                          isDark 
                            ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' 
                            : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                        } focus:outline-none`}
                      >
                        <option value="daily">Todos os dias</option>
                        <option value="weekdays">Apenas dias úteis</option>
                        <option value="weekly">Semanalmente</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                        Quantidade de Leads por Dia
                      </label>
                      <input
                        type="number"
                        value={leadsPerDay}
                        onChange={(e) => setLeadsPerDay(Number(e.target.value))}
                        min="1"
                        max="1000"
                        className={`w-full px-4 py-2 border-b transition-all ${
                          isDark 
                            ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' 
                            : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                        } focus:outline-none`}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Horário de Envios */}
                <div>
                  <h3 className={`mb-4 font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    Horário de Envios
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                          Início
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className={`w-full px-4 py-2 border-b transition-all ${
                            isDark 
                              ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' 
                              : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                          } focus:outline-none`}
                        />
                      </div>

                      <div>
                        <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                          Fim
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className={`w-full px-4 py-2 border-b transition-all ${
                            isDark 
                              ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' 
                              : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                          } focus:outline-none`}
                        />
                      </div>
                    </div>

                    <div className="p-3">
                      <p className={`text-sm ${isDark ? 'text-white/60' : 'text-text-secondary-light'}`}>
                        <Clock className="w-4 h-4 inline mr-1.5" />
                        Intervalo: {calculateInterval()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instruções para I.A - Full Width */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Instruções para Geração de Mensagens
                </label>
                <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Como a I.A deve gerar as mensagens de prospecção
                </p>
                <textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={4}
                  placeholder="Ex: 'Gerar mensagem profissional mas amigável. Mencionar benefícios específicos do produto baseado no perfil da academia (tamanho, localização, etc). Oferecer desconto de 15% na primeira compra. Incluir call-to-action clara.'"
                  className={`w-full px-4 py-2.5 border-b transition-all resize-none ${
                    isDark 
                      ? 'bg-black border-white/[0.2] text-white placeholder:text-white/30 focus:bg-white/[0.1] focus:border-[#0169D9]' 
                      : 'bg-white border border-border-light text-text-primary-light placeholder:text-gray-400 focus:border-[#0169D9]'
                  } focus:outline-none`}
                />
              </div>

              {/* Botão Salvar */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    // TODO: Implementar salvamento no backend
                    setSaving(true);
                    setTimeout(() => {
                      setSaving(false);
                      console.log('Configuração salva:', {
                        isActive: campaignActive,
                        frequency,
                        startTime,
                        endTime,
                        leadsPerDay,
                        instructions: aiInstructions
                      });
                    }, 1000);
                  }}
                  disabled={saving}
                  className="px-6 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Configuração</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Histórico de Campanhas */}
          <div className={`rounded-lg border overflow-hidden ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className={`px-6 py-3.5 border-b ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
                Histórico de Campanhas
              </h2>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`text-xs uppercase ${
                    isDark ? 'text-white/50 bg-white/[0.02]' : 'text-text-secondary-light bg-light-elevated'
                  }`}>
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Data/Hora</th>
                      <th className="px-6 py-3 text-left font-medium">Campanha</th>
                      <th className="px-6 py-3 text-left font-medium">Leads</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Fontes</th>
                      <th className="px-6 py-3 text-left font-medium">Localização</th>
                      <th className="px-6 py-3 text-center font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${
                    isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light'
                  }`}>
                    {currentCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center">
                          <p className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                            Nenhuma campanha realizada ainda
                          </p>
                        </td>
                      </tr>
                    ) : (
                      currentCampaigns.map((campaign) => (
                        <tr key={campaign.id} className={`transition-all ${
                          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-light-elevated/50'
                        }`}>
                          {/* Data/Hora */}
                          <td className={`px-6 py-3 whitespace-nowrap ${
                            isDark ? 'text-white/70' : 'text-text-primary-light'
                          }`}>
                            <div className="font-medium">{campaign.date}</div>
                            <div className={`text-xs ${
                              isDark ? 'text-white/40' : 'text-text-secondary-light'
                            }`}>
                              {campaign.startTime}
                            </div>
                          </td>

                          {/* Campanha */}
                          <td className={`px-6 py-3 whitespace-nowrap ${
                            isDark ? 'text-white/70' : 'text-text-primary-light'
                          }`}>
                            {campaign.name}
                          </td>

                          {/* Leads */}
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                                campaign.leadsSent >= campaign.leadsRequested 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : campaign.leadsSent > 0 
                                    ? 'bg-yellow-500/10 text-yellow-500' 
                                    : 'bg-red-500/10 text-red-500'
                              }`}>
                                {campaign.leadsSent}
                              </span>
                              <span className={isDark ? 'text-white/30' : 'text-text-secondary-light'}>/</span>
                              <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                                {campaign.leadsRequested}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-sm font-medium ${
                              campaign.responseRate >= 10
                                ? 'bg-green-500/10 text-green-500' 
                                : campaign.responseRate >= 5
                                  ? 'bg-yellow-500/10 text-yellow-500' 
                                  : 'bg-red-500/10 text-red-500'
                            }`}>
                              {campaign.responseRate >= 10 ? '✓' : campaign.responseRate >= 5 ? '⚠' : '✗'} {campaign.responseRate}% respostas
                            </div>
                          </td>

                          {/* Fontes */}
                          <td className={`px-6 py-3 whitespace-nowrap ${
                            isDark ? 'text-white/60' : 'text-text-secondary-light'
                          }`}>
                            Maps: {campaign.sources.googleMaps.percent}%, CNPJ: {campaign.sources.cnpj.percent}%
                          </td>

                          {/* Localização */}
                          <td className={`px-6 py-3 whitespace-nowrap ${
                            isDark ? 'text-white/60' : 'text-text-secondary-light'
                          }`}>
                            {campaign.locations[0]?.name || '-'}
                          </td>

                          {/* Ações */}
                          <td className="px-6 py-3 text-center whitespace-nowrap">
                            <button
                              className="px-3 py-1 text-sm rounded-lg bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
                            >
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className={`px-6 py-3.5 border-t flex items-center justify-between ${
                  isDark ? 'border-white/[0.08]' : 'border-border-light'
                }`}>
                  <p className={`text-sm ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Mostrando <span className="font-medium">{startIndex + 1} - {Math.min(endIndex, campaignHistory.length)}</span> de <span className="font-medium">{campaignHistory.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                        currentPage === 1
                          ? isDark ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                          : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                      }`}
                    >
                      Anterior
                    </button>
                    <span className={`px-3 text-sm ${
                      isDark ? 'text-white/70' : 'text-text-primary-light'
                    }`}>
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                        currentPage === totalPages
                          ? isDark ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                          : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                      }`}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}