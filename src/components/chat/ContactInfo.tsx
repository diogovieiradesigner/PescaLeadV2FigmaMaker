import { MessageSquare, X, User, Bot, ChevronDown, ChevronUp, DollarSign, Calendar, Tag, User as UserIcon } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Conversation } from '../../types/chat';
import { useState } from 'react';

interface ContactInfoProps {
  conversation: Conversation | null;
  theme: Theme;
  onStatusChange?: (conversationId: string, status: string) => void;
  onAssigneeChange?: (conversationId: string, assignee: string) => void;
}

export function ContactInfo({ conversation, theme, onStatusChange, onAssigneeChange }: ContactInfoProps) {
  const isDark = theme === 'dark';
  const [isHumanAttendant, setIsHumanAttendant] = useState(true);
  const [showPipelineData, setShowPipelineData] = useState(false);

  if (!conversation) {
    return null;
  }

  // Mock pipeline data
  const pipelineData = {
    dealValue: 'R$ 15.000,00',
    stage: 'Negociação',
    priority: 'Alta',
    source: 'WhatsApp',
    closeDate: '15/12/2024',
    tags: ['Hot Lead', 'Produto A'],
    responsible: 'João Santos',
    company: 'Tech Solutions LTDA',
    email: 'contato@techsolutions.com',
  };

  return (
    <div
      className={`w-80 border-l flex flex-col transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Header */}
      <div
        className={`px-6 py-4 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}
      >
        <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
          Informações do Contato
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Avatar and Name */}
        <div className="text-center">
          <div
            className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
              isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
            }`}
          >
            <img
              src={conversation.avatar}
              alt={conversation.contactName}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <h3
            className={`mb-1 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}
          >
            {conversation.contactName}
          </h3>
          <p
            className={`text-sm ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            {conversation.contactPhone}
          </p>
        </div>

        {/* Canal */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Canal
          </label>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              isDark
                ? 'bg-elevated border-white/[0.08]'
                : 'bg-light-elevated border-border-light'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-green-500" />
            <span
              className={`text-sm ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}
            >
              WhatsApp
            </span>
          </div>
        </div>

        {/* Tipo de Atendimento */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Tipo de Atendimento
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsHumanAttendant(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                isHumanAttendant
                  ? 'bg-[#0169D9] border-[#0169D9] text-white'
                  : isDark
                  ? 'bg-elevated border-white/[0.08] text-white/50 hover:bg-white/[0.05]'
                  : 'bg-light-elevated border-border-light text-text-secondary-light hover:bg-light-elevated-hover'
              }`}
            >
              <User className="w-4 h-4" />
              Humano
            </button>
            <button
              onClick={() => setIsHumanAttendant(false)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                !isHumanAttendant
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : isDark
                  ? 'bg-elevated border-white/[0.08] text-white/50 hover:bg-white/[0.05]'
                  : 'bg-light-elevated border-border-light text-text-secondary-light hover:bg-light-elevated-hover'
              }`}
            >
              <Bot className="w-4 h-4" />
              I.A
            </button>
          </div>
        </div>

        {/* Status de Atendimento */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Status de Atendimento
          </label>
          <select
            className={`w-full border px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white'
                : 'bg-light-elevated border-border-light text-text-primary-light'
            }`}
            value={conversation.status}
            onChange={(e) => onStatusChange && onStatusChange(conversation.id, e.target.value)}
          >
            <option value="waiting">Aguardando</option>
            <option value="in-progress">Em Atendimento</option>
            <option value="resolved">Resolvido</option>
          </select>
        </div>

        {/* Atendente Responsável */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Atendente Responsável
          </label>
          <select
            className={`w-full border px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white'
                : 'bg-light-elevated border-border-light text-text-primary-light'
            }`}
            value={conversation.assignedTo}
            onChange={(e) => onAssigneeChange && onAssigneeChange(conversation.id, e.target.value)}
          >
            <option value="Não atribuído">Não atribuído</option>
            <option value="João Santos">João Santos</option>
            <option value="Ana Paula">Ana Paula</option>
            <option value="Carla Lima">Carla Lima</option>
          </select>
        </div>

        {/* Dados da Pipeline */}
        <div>
          <button
            onClick={() => setShowPipelineData(!showPipelineData)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border ${
              isDark
                ? 'bg-elevated border-white/[0.08] hover:bg-white/[0.08] text-white'
                : 'bg-light-elevated border-border-light hover:bg-light-elevated-hover text-text-primary-light'
            }`}
          >
            <span>Dados da Pipeline</span>
            {showPipelineData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPipelineData && (
            <div className={`mt-3 p-3 rounded-lg border space-y-3 ${
              isDark ? 'bg-elevated border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              {/* Valor do Negócio */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Valor
                  </span>
                </div>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {pipelineData.dealValue}
                </span>
              </div>

              {/* Etapa */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Etapa
                  </span>
                </div>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {pipelineData.stage}
                </span>
              </div>

              {/* Prioridade */}
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Prioridade
                </span>
                <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                  {pipelineData.priority}
                </span>
              </div>

              {/* Data de Fechamento */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Fechamento
                  </span>
                </div>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {pipelineData.closeDate}
                </span>
              </div>

              {/* Responsável */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Responsável
                  </span>
                </div>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {pipelineData.responsible}
                </span>
              </div>

              {/* Tags */}
              <div>
                <span className={`text-xs block mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Tags
                </span>
                <div className="flex flex-wrap gap-1">
                  {pipelineData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded bg-[#0169D9]/10 text-[#0169D9] border border-[#0169D9]/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Empresa */}
              <div>
                <span className={`text-xs block mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Empresa
                </span>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {pipelineData.company}
                </span>
              </div>

              {/* Email */}
              <div>
                <span className={`text-xs block mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Email
                </span>
                <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {pipelineData.email}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div>
          <h4
            className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}
          >
            Estatísticas
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Total de mensagens
              </span>
              <span
                className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}
              >
                {conversation.totalMessages}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Última atualização
              </span>
              <span
                className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}
              >
                {conversation.lastUpdate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Mensagens não lidas
              </span>
              <span className="text-sm text-green-500">
                {conversation.unreadCount}
              </span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div>
          <h4
            className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}
          >
            Ações Rápidas
          </h4>
          <div className="space-y-2">
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border border-red-500/20 ${
                isDark
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                  : 'bg-red-500/5 hover:bg-red-500/10 text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
              Encerrar Atendimento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
