import { useState, useEffect, useCallback } from 'react';
import { Loader2, Play, Moon, Sun, Clock, AlertCircle, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner@2.0.3';
import { ProfileMenu } from './ProfileMenu';
import { Badge } from './ui/badge';
import { CampaignDetailsView } from './CampaignDetailsView';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type Theme = 'dark' | 'light';

interface CampaignViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  onNavigateToPipeline?: () => void;
  urlRunId?: string | null;
  onRunChange?: (runId: string | null) => void;
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

interface CampaignRun {
  id: string;
  name: string; // Nome personalizado da run
  run_date: string;
  status: string;
  leads_total: number;
  leads_success: number;
  leads_failed: number;
  started_at: string;
  completed_at: string;
  duration_formatted: string;
  success_rate: number;
  replied_count: number;
}

interface CampaignRunsResponse {
  total: number;
  runs: CampaignRun[];
}

export function CampaignView({ theme, onThemeToggle, onNavigateToSettings, onNavigateToPipeline, urlRunId, onRunChange }: CampaignViewProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  // Constante de intervalo mínimo (150 segundos para evitar bloqueio do WhatsApp)
  const MIN_INTERVAL_SECONDS = 150;

  // Estados para configuração
  const [configId, setConfigId] = useState<string | null>(null);
  const [campaignActive, setCampaignActive] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>('daily');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [dailyLimit, setDailyLimit] = useState(50);
  const [inboxId, setInboxId] = useState(''); // Principal
  const [reserveInboxIds, setReserveInboxIds] = useState<string[]>([]); // ✅ NOVO: Reservas
  const [fallbackBehavior, setFallbackBehavior] = useState<'pause' | 'switch_to_reserve'>('pause'); // ✅ NOVO
  const [funnelId, setFunnelId] = useState('');
  const [sourceColumnId, setSourceColumnId] = useState('');
  const [targetColumnId, setTargetColumnId] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [splitMessages, setSplitMessages] = useState(false);
  const [maxSplitParts, setMaxSplitParts] = useState(3);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Estados para dados do Supabase
  const [inboxes, setInboxes] = useState<Array<{
    id: string;
    name: string;
    inbox_instances?: Array<{
      instance_id: string;
      instances?: {
        status: string;
        name: string;
      };
    }>;
  }>>([]);
  const [funnels, setFunnels] = useState<Array<{ id: string; name: string }>>([]);
  const [columns, setColumns] = useState<Array<{ id: string; title: string; position: number }>>([]);

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estado para controlar visualização de detalhes
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Estado para executar campanha
  const [executing, setExecuting] = useState(false);

  // Estados para dados reais da API
  const [campaignRuns, setCampaignRuns] = useState<CampaignRun[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [loadingRuns, setLoadingRuns] = useState(true);

  // Estados para deletar campanha
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [confirmDeleteRunId, setConfirmDeleteRunId] = useState<string | null>(null);

  // ✅ Abrir run automaticamente quando há runId na URL
  useEffect(() => {
    if (urlRunId && urlRunId !== selectedRunId) {
      setSelectedRunId(urlRunId);
    }
  }, [urlRunId, selectedRunId]);

  // ✅ Wrapper para abrir detalhes que também atualiza a URL
  const handleOpenRunDetails = useCallback((runId: string) => {
    setSelectedRunId(runId);
    onRunChange?.(runId);
  }, [onRunChange]);

  // ✅ Wrapper para fechar detalhes que também limpa a URL
  const handleCloseRunDetails = useCallback(() => {
    setSelectedRunId(null);
    onRunChange?.(null);
  }, [onRunChange]);

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
    
    if (totalMinutes > 0 && dailyLimit > 0) {
      const intervalPerLeadMinutes = totalMinutes / dailyLimit;
      const intervalPerLeadSeconds = Math.floor(intervalPerLeadMinutes * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      const isValid = intervalPerLeadSeconds >= MIN_INTERVAL_SECONDS;
      
      return {
        text: `${hours}h ${minutes}min (${intervalPerLeadMinutes.toFixed(1)} min/lead)`,
        intervalSeconds: intervalPerLeadSeconds,
        isValid
      };
    }
    
    return {
      text: '0h 0min',
      intervalSeconds: 0,
      isValid: false
    };
  };

  // ✅ NOVA: Função para verificar se é possível executar agora
  const canExecuteNow = () => {
    const now = new Date();
    const [currentHour, currentMinute] = [now.getHours(), now.getMinutes()];
    const currentMinutes = currentHour * 60 + currentMinute;
    
    const [endHour, endMin] = endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMin;
    
    // ✅ CORREÇÃO: Verificar se já passou do end_time
    if (currentMinutes >= endMinutes) {
      return {
        canExecute: false,
        reason: `Já passou do horário limite (${endTime})`,
        timeRemaining: 0
      };
    }
    
    // ✅ CORREÇÃO: Calcular tempo restante até end_time usando horário atual REAL
    const timeRemaining = endMinutes - currentMinutes;
    
    // Verificar se há tempo mínimo para pelo menos 1 lead (30 segundos)
    if (timeRemaining < 1) {
      return {
        canExecute: false,
        reason: 'Tempo insuficiente até o horário limite',
        timeRemaining
      };
    }
    
    return {
      canExecute: true,
      reason: '',
      timeRemaining
    };
  };

  // ✅ NOVA: Função para formatar tempo restante
  const formatTimeRemaining = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  // Função para carregar colunas quando funil é selecionado
  const loadFunnelColumns = async (selectedFunnelId: string) => {
    if (!selectedFunnelId) {
      setColumns([]);
      return;
    }

    const { data: columnsData, error } = await supabase
      .from('funnel_columns')
      .select('id, title, position')
      .eq('funnel_id', selectedFunnelId)
      .order('position');

    if (error) {
      console.error('Erro ao carregar colunas do funil:', error);
    } else {
      setColumns(columnsData || []);
    }
  };

  // Função para carregar configuração existente
  const loadExistingConfig = async () => {
    if (!currentWorkspace) return;

    const { data: config, error } = await supabase
      .from('campaign_configs')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar configuração:', error);
    } else if (config) {
      setConfigId(config.id || null);
      setCampaignActive(config.is_active || false);
      setFrequency(config.frequency || 'daily');
      setStartTime(config.start_time || '09:00');
      setEndTime(config.end_time || '18:00');
      setDailyLimit(config.daily_limit || 50);
      setInboxId(config.inbox_id || '');
      setFallbackBehavior(config.fallback_behavior || 'pause'); // ✅ NOVO
      setFunnelId(config.source_funnel_id || '');
      setSourceColumnId(config.source_column_id || '');
      setTargetColumnId(config.target_column_id || '');
      setAiInstructions(config.ai_instructions || '');
      setSplitMessages(config.split_messages || false);
      setMaxSplitParts(config.max_split_parts || 3);

      // ✅ NOVO: Carregar inboxes reserva
      if (config.id) {
        const { data: instanceConfigs } = await supabase
          .from('campaign_instance_config')
          .select('inbox_id, priority')
          .eq('campaign_config_id', config.id)
          .eq('is_active', true)
          .order('priority');

        if (instanceConfigs && instanceConfigs.length > 0) {
          // Separar principal (priority=1) das reservas (priority>1)
          const reserves = instanceConfigs
            .filter(ic => ic.priority > 1)
            .map(ic => ic.inbox_id);
          setReserveInboxIds(reserves);
        }
      }

      // Carregar colunas se houver funil selecionado
      if (config.source_funnel_id) {
        loadFunnelColumns(config.source_funnel_id);
      }
    }
  };

  // Função para validar configuração
  const validateConfig = (): string[] => {
    const errors: string[] = [];

    // Horários
    if (startTime >= endTime) {
      errors.push('Horário de início deve ser antes do fim');
    }

    // Colunas diferentes
    if (sourceColumnId && targetColumnId && sourceColumnId === targetColumnId) {
      errors.push('Coluna de origem e destino devem ser diferentes');
    }

    // Validar intervalo mínimo
    const intervalData = calculateInterval();
    if (!intervalData.isValid) {
      errors.push(`Intervalo entre envios (${intervalData.intervalSeconds}s) é menor que o mínimo permitido (${MIN_INTERVAL_SECONDS}s). Ajuste o limite diário ou horário.`);
    }

    // Limite cabe na janela
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const windowMinutes = endMinutes - startMinutes;
    const minIntervalMinutes = MIN_INTERVAL_SECONDS / 60;
    const maxLeads = Math.floor(windowMinutes / minIntervalMinutes);

    if (dailyLimit > maxLeads) {
      errors.push(`Máximo ${maxLeads} mensagens para esta janela de horário (mínimo ${MIN_INTERVAL_SECONDS}s entre envios)`);
    }

    // Campos obrigatórios
    if (!inboxId) errors.push('Selecione uma caixa de entrada');
    if (!funnelId) errors.push('Selecione um funil');
    if (!sourceColumnId) errors.push('Selecione a coluna de origem');
    if (!targetColumnId) errors.push('Selecione a coluna de destino');
    if (!aiInstructions.trim()) errors.push('Instruções da IA são obrigatórias');

    // Validação de max_split_parts
    if (splitMessages && (maxSplitParts < 1 || maxSplitParts > 5)) {
      errors.push('Número de partes deve estar entre 1 e 5');
    }

    return errors;
  };

  // Função para salvar configuração
  const saveConfig = async () => {
    if (!currentWorkspace) return;

    // Validar
    const errors = validateConfig();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from('campaign_configs')
      .upsert({
        workspace_id: currentWorkspace.id,
        is_active: campaignActive,
        frequency,
        start_time: startTime,
        end_time: endTime,
        daily_limit: dailyLimit,
        min_interval_seconds: MIN_INTERVAL_SECONDS,
        inbox_id: inboxId, // Manter compatibilidade
        source_funnel_id: funnelId,
        source_column_id: sourceColumnId,
        target_column_id: targetColumnId,
        ai_instructions: aiInstructions,
        split_messages: splitMessages,
        max_split_parts: maxSplitParts,
        fallback_behavior: fallbackBehavior // ✅ NOVO
      }, { onConflict: 'workspace_id' })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar configuração:', error);
      setValidationErrors(['Erro ao salvar configuração. Tente novamente.']);
      toast.error('Erro ao salvar configuração');
      setSaving(false);
      return;
    }

    // ✅ NOVO: Salvar configuração de múltiplos inboxes
    if (data?.id) {
      try {
        // 1. Buscar inboxes existentes
        const { data: existingConfigs } = await supabase
          .from('campaign_instance_config')
          .select('inbox_id')
          .eq('campaign_config_id', data.id);

        const existingInboxIds = existingConfigs?.map(c => c.inbox_id) || [];
        const newInboxIds = [inboxId, ...reserveInboxIds];

        // 2. Remover inboxes que não estão mais selecionados
        const toRemove = existingInboxIds.filter(id => !newInboxIds.includes(id));
        if (toRemove.length > 0) {
          await supabase
            .from('campaign_instance_config')
            .delete()
            .eq('campaign_config_id', data.id)
            .in('inbox_id', toRemove);
        }

        // 3. Upsert principal + reservas
        const inboxConfigs = [
          {
            campaign_config_id: data.id,
            inbox_id: inboxId,
            priority: 1,
            is_active: true
          },
          ...reserveInboxIds.map((id, idx) => ({
            campaign_config_id: data.id,
            inbox_id: id,
            priority: idx + 2,
            is_active: true
          }))
        ];

        const { error: instanceError } = await supabase
          .from('campaign_instance_config')
          .upsert(inboxConfigs, {
            onConflict: 'campaign_config_id,inbox_id'
          });

        if (instanceError) {
          console.error('Erro ao salvar inboxes de reserva:', instanceError);
          toast.error('Erro ao salvar números reserva');
        } else {
          console.log(`✅ Salvos: 1 principal + ${reserveInboxIds.length} reservas`);
        }
      } catch (err) {
        console.error('Erro ao processar inboxes:', err);
        toast.error('Erro ao salvar configuração de inboxes');
      }
    }

    console.log('Configuração salva com sucesso!');
    setValidationErrors([]);
    toast.success('Configuração salva com sucesso!');

    // Atualizar configId
    if (data?.id) {
      setConfigId(data.id);
    }

    setSaving(false);
  };

  // Função helper para verificar se inbox está conectado
  const isInboxConnected = (selectedInboxId: string): boolean => {
    const inbox = inboxes.find(i => i.id === selectedInboxId);
    return inbox?.inbox_instances?.[0]?.instances?.status === 'connected';
  };

  // Função para obter nome da instância de um inbox
  const getInboxInstanceName = (selectedInboxId: string): string => {
    const inbox = inboxes.find(i => i.id === selectedInboxId);
    return inbox?.inbox_instances?.[0]?.instances?.name || inbox?.name || 'WhatsApp';
  };

  // Função para executar campanha agora
  const executeNow = async () => {
    console.log('🚀 [EXECUTE NOW] Iniciando execução da campanha...');
    console.log('📊 [EXECUTE NOW] Workspace atual:', currentWorkspace);
    console.log('⚙️ [EXECUTE NOW] Config ID:', configId);

    if (!currentWorkspace) {
      console.error('❌ [EXECUTE NOW] Workspace não encontrado');
      toast.error('Workspace não encontrado');
      return;
    }

    if (!configId) {
      console.error('❌ [EXECUTE NOW] Config ID não encontrado - salve a configuração primeiro');
      toast.error('Salve a configuração da campanha primeiro');
      return;
    }

    // Validar configuração primeiro
    console.log('🔍 [EXECUTE NOW] Validando configuração...');
    const errors = validateConfig();
    setValidationErrors(errors);
    console.log('📋 [EXECUTE NOW] Erros de validação:', errors);

    if (errors.length > 0) {
      console.error('❌ [EXECUTE NOW] Erros de validação encontrados:', errors);
      toast.error('Corrija os erros de configuração primeiro');
      return;
    }

    // Verificar se instância está conectada ANTES de executar
    if (inboxId && !isInboxConnected(inboxId)) {
      const instanceName = getInboxInstanceName(inboxId);
      console.error(`❌ [EXECUTE NOW] Instância '${instanceName}' está desconectada`);
      toast.error(`WhatsApp '${instanceName}' está desconectado`, {
        duration: 5000,
        description: 'Reconecte o WhatsApp nas Configurações antes de executar a campanha.'
      });
      return;
    }

    setExecuting(true);
    console.log('⏳ [EXECUTE NOW] Estado de execução ativado');

    try {
      const requestBody = { config_id: configId };
      console.log('📤 [EXECUTE NOW] Enviando requisição para edge function...');
      console.log('📦 [EXECUTE NOW] Body da requisição:', JSON.stringify(requestBody, null, 2));

      const { data, error } = await supabase.functions.invoke('campaign-execute-now', {
        body: requestBody
      });

      console.log('📥 [EXECUTE NOW] Resposta recebida da edge function');
      console.log('✅ [EXECUTE NOW] Data:', JSON.stringify(data, null, 2));
      console.log('⚠️ [EXECUTE NOW] Error:', error);

      if (error) {
        console.error('❌ [EXECUTE NOW] Erro no invoke da edge function:', error);
        console.error('❌ [EXECUTE NOW] Error message:', error.message);
        console.error('❌ [EXECUTE NOW] Error completo:', JSON.stringify(error, null, 2));

        // Tentar extrair mensagem do data se disponível (fallback)
        if (data?.error) {
          const errorCode = data.error_code;
          if (errorCode === 'INSTANCE_DISCONNECTED') {
            toast.error(data.error, {
              duration: 5000,
              description: 'Reconecte o WhatsApp nas Configurações.'
            });
          } else if (errorCode === 'INSTANCE_BUSY') {
            toast.error(data.error, {
              duration: 6000,
              description: 'Pause ou aguarde a campanha atual concluir.'
            });
          } else {
            toast.error(data.error);
          }
        } else {
          // Mensagem genérica mais clara quando SDK retorna erro HTTP
          toast.error('Erro ao executar campanha', {
            duration: 5000,
            description: 'Verifique se o WhatsApp está conectado nas Configurações.'
          });
        }
        return;
      }

      if (data.error) {
        console.error('❌ [EXECUTE NOW] Erro retornado pela edge function:', data.error);
        console.error('❌ [EXECUTE NOW] Código do erro:', data.error_code);
        console.error('❌ [EXECUTE NOW] Data completo:', JSON.stringify(data, null, 2));

        // Tratamento específico por código de erro
        if (data.error_code === 'INSTANCE_DISCONNECTED') {
          toast.error(data.error, { duration: 5000 });
        } else if (data.error_code === 'INSTANCE_BUSY') {
          toast.error(data.error, { 
            duration: 6000,
            description: data.running_run_id ? 'Pause ou aguarde a campanha atual concluir.' : undefined
          });
        } else {
          toast.error(data.error);
        }
        return;
      }

      // Sucesso!
      console.log('✅ [EXECUTE NOW] Campanha executada com sucesso!');
      console.log('📊 [EXECUTE NOW] Leads agendados:', data.leads_scheduled);
      console.log('🆔 [EXECUTE NOW] Run ID:', data.run_id);

      toast.success(`${data.leads_scheduled} leads agendados!`);

      // Resetar para página 1 e recarregar lista de execuções
      console.log('🔄 [EXECUTE NOW] Recarregando lista de execuções...');
      setCurrentPage(1);
      await loadCampaignRuns();

      // Abrir detalhes da execução recém-criada
      if (data.run_id) {
        console.log('📂 [EXECUTE NOW] Abrindo detalhes da execução:', data.run_id);
        handleOpenRunDetails(data.run_id);
      }

      console.log('✅ [EXECUTE NOW] Processo concluído com sucesso!');
    } catch (error) {
      console.error('❌ [EXECUTE NOW] Exceção capturada no try/catch:', error);
      console.error('❌ [EXECUTE NOW] Tipo do erro:', typeof error);
      console.error('❌ [EXECUTE NOW] Erro completo:', JSON.stringify(error, null, 2));
      console.error('❌ [EXECUTE NOW] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      toast.error('Erro ao executar campanha. Tente novamente.');
    } finally {
      console.log('🏁 [EXECUTE NOW] Finalizando - desativando estado de execução');
      setExecuting(false);
    }
  };

  // Função para carregar dados do Supabase
  const loadSupabaseData = async () => {
    if (!currentWorkspace) return;

    // Carregar inboxes com status da instância
    const { data: inboxesData, error: inboxesError } = await supabase
      .from('inboxes')
      .select(`
        id,
        name,
        inbox_instances(
          instance_id,
          instances(
            status,
            name
          )
        )
      `)
      .eq('workspace_id', currentWorkspace.id);
    if (inboxesError) {
      console.error('Erro ao carregar inboxes:', inboxesError);
    } else {
      setInboxes(inboxesData || []);
    }

    // Carregar funnels
    const { data: funnelsData, error: funnelsError } = await supabase
      .from('funnels')
      .select('id, name')
      .eq('workspace_id', currentWorkspace.id);
    if (funnelsError) {
      console.error('Erro ao carregar funnels:', funnelsError);
    } else {
      setFunnels(funnelsData || []);
    }

    // Não carregar colunas aqui - elas dependem do funil selecionado
    // A função loadFunnelColumns será chamada quando um funil for selecionado

    setLoading(false);
  };

  // Função para carregar runs da campanha
  const loadCampaignRuns = async () => {
    if (!currentWorkspace) return;

    setLoadingRuns(true);
    
    try {
      const { data, error } = await supabase.rpc('get_campaign_runs_list', {
        p_workspace_id: currentWorkspace.id,
        p_limit: itemsPerPage,
        p_offset: (currentPage - 1) * itemsPerPage
      });

      if (error) {
        console.error('Erro ao carregar runs de campanha:', error);
      } else if (data) {
        setCampaignRuns(data.runs || []);
        setTotalRuns(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar runs:', error);
    } finally {
      setLoadingRuns(false);
    }
  };

  // Função para deletar campanha
  const handleDeleteCampaign = async (runId: string) => {
    setDeletingRunId(runId);
    
    try {
      // Buscar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Chamar endpoint do backend
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/campaigns/${runId}?workspaceId=${currentWorkspace.id}`;
      console.log('🗑️ Deletando campanha via backend:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📦 Resposta do backend:', data);

      if (!response.ok) {
        console.error('Erro ao deletar campanha:', data);
        toast.error(data.error || 'Erro ao deletar campanha');
        return;
      }

      toast.success('Campanha deletada com sucesso!');
      
      // Recarregar lista
      await loadCampaignRuns();
      
      // Fechar modal de confirmação
      setConfirmDeleteRunId(null);
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast.error('Erro ao deletar campanha. Tente novamente.');
    } finally {
      setDeletingRunId(null);
    }
  };

  useEffect(() => {
    loadSupabaseData();
    loadExistingConfig();
  }, [currentWorkspace]);

  useEffect(() => {
    loadCampaignRuns();
  }, [currentWorkspace, currentPage]);

  // Carregar colunas quando funil mudar
  const handleFunnelChange = (selectedFunnelId: string) => {
    setFunnelId(selectedFunnelId);
    setSourceColumnId('');
    setTargetColumnId('');
    loadFunnelColumns(selectedFunnelId);
  };

  // Paginação
  const totalPages = Math.ceil(totalRuns / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Função para refresh após ações de controle
  const handleRefreshDetails = () => {
    // Recarregar a lista de runs para refletir mudanças de status
    loadCampaignRuns();
  };

  // ✅ NOVA: Verificar validação antes de permitir executar
  const validInterval = calculateInterval().isValid;

  // Se houver um runId selecionado, exibir o dashboard de detalhes
  if (selectedRunId) {
    return (
      <CampaignDetailsView
        theme={theme}
        onThemeToggle={onThemeToggle}
        runId={selectedRunId}
        onBack={handleCloseRunDetails}
        onNavigateToSettings={onNavigateToSettings}
        onRefresh={handleRefreshDetails}
      />
    );
  }

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
          {/* Save Configuration Button */}
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </>
            )}
          </button>

          {/* Execute Now Button */}
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={executeNow}
              disabled={executing || !canExecuteNow().canExecute}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executando...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Executar Agora</span>
                </>
              )}
            </button>

            {/* ✅ NOVA: Nota informativa sobre restrição de horário */}
            {!canExecuteNow().canExecute && canExecuteNow().reason && (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>{canExecuteNow().reason}</span>
              </div>
            )}

            {canExecuteNow().canExecute && canExecuteNow().timeRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Clock className="w-3 h-3" />
                <span>Tempo disponível: {formatTimeRemaining(canExecuteNow().timeRemaining)}</span>
              </div>
            )}
          </div>

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
          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
                <span className={isDark ? 'text-white/70' : 'text-text-primary-light'}>
                  Carregando configurações...
                </span>
              </div>
            </div>
          ) : (funnels.length === 0 || inboxes.length === 0) ? (
            <div className={`p-6 rounded-lg border ${
              isDark 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">Configuração necessária</h3>
                  <p className="text-sm mb-3">
                    Para usar o sistema de campanhas, você precisa:
                  </p>
                  <ul className="text-sm space-y-2 mb-4 list-disc list-inside">
                    {funnels.length === 0 && (
                      <li>Criar pelo menos um <strong>funil</strong> com uma <strong>coluna</strong> na seção de Pipeline</li>
                    )}
                    {inboxes.length === 0 && (
                      <li>Configurar pelo menos uma <strong>caixa de entrada</strong> (WhatsApp) na seção de Configurações</li>
                    )}
                  </ul>
                  <div className="flex items-center gap-3">
                    {funnels.length === 0 && (
                      <button
                        onClick={onNavigateToPipeline}
                        className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Ir para a Pipeline
                      </button>
                    )}
                    {inboxes.length === 0 && (
                      <button
                        onClick={onNavigateToSettings}
                        className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Ir para Configurações
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                      </select>
                    </div>

                    <div>
                      <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                        Quantidade de Leads por Dia
                      </label>
                      <input
                        type="number"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(Number(e.target.value))}
                        min="1"
                        max="500"
                        className={`w-full px-4 py-2 border-b transition-all ${
                          isDark 
                            ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' 
                            : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                        } focus:outline-none`}
                        placeholder="50"
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

                    {/* Cálculo de Intervalo Automático */}
                    <div className="p-3">
                      <p className={`text-sm flex items-center gap-2 ${
                        calculateInterval().isValid
                          ? isDark ? 'text-white/60' : 'text-text-secondary-light'
                          : isDark ? 'text-red-400' : 'text-red-600'
                      }`}>
                        <Clock className="w-4 h-4 inline" />
                        Intervalo: {calculateInterval().text}
                      </p>
                      {!calculateInterval().isValid && calculateInterval().intervalSeconds > 0 && (
                        <p className={`text-xs mt-1 ml-6 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                          Intervalo muito baixo (mínimo: {MIN_INTERVAL_SECONDS}s). Ajuste o limite ou horário.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Caixa de Entrada (WhatsApp) */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Caixa de Entrada (WhatsApp)
                </label>
                <select
                  value={inboxId}
                  onChange={(e) => setInboxId(e.target.value)}
                  className={`w-full px-4 py-2 border-b transition-all ${
                    isDark
                      ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] [&>option]:bg-zinc-900 [&>option]:text-white'
                      : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                  } focus:outline-none`}
                >
                  <option value="" className={isDark ? 'bg-zinc-900 text-white' : ''}>
                    Selecione uma caixa de entrada...
                  </option>
                  {inboxes.map(inbox => {
                    const instanceStatus = inbox.inbox_instances?.[0]?.instances?.status;
                    const isConnected = instanceStatus === 'connected';
                    return (
                      <option key={inbox.id} value={inbox.id} className={isDark ? 'bg-zinc-900 text-white' : ''}>
                        {isConnected ? '🟢' : '🔴'} {inbox.name}
                      </option>
                    );
                  })}
                </select>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  WhatsApp principal para enviar mensagens (🟢 conectado / 🔴 desconectado)
                </p>
              </div>

              {/* ✅ NOVO: Números Reserva */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Números Reserva (Opcional)
                </label>
                <div className={`w-full border rounded-md ${
                  isDark
                    ? 'bg-black border-white/[0.2]'
                    : 'bg-white border-border-light'
                } p-2`}
                  style={{ maxHeight: '150px', overflowY: 'auto' }}
                >
                  {inboxes
                    .filter(i => i.id !== inboxId) // Excluir o principal
                    .map(inbox => {
                      const instanceStatus = inbox.inbox_instances?.[0]?.instances?.status;
                      const isConnected = instanceStatus === 'connected';
                      const isSelected = reserveInboxIds.includes(inbox.id);

                      return (
                        <label
                          key={inbox.id}
                          className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                            isDark
                              ? 'hover:bg-white/[0.05]'
                              : 'hover:bg-zinc-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReserveInboxIds([...reserveInboxIds, inbox.id]);
                              } else {
                                setReserveInboxIds(reserveInboxIds.filter(id => id !== inbox.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`flex-1 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                            {inbox.name}
                          </span>
                        </label>
                      );
                    })}
                  {inboxes.filter(i => i.id !== inboxId).length === 0 && (
                    <p className={`text-xs text-center py-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Nenhum outro WhatsApp disponível
                    </p>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  {reserveInboxIds.length > 0
                    ? `${reserveInboxIds.length} número(s) reserva selecionado(s)`
                    : 'Clique para selecionar números de backup'
                  }
                </p>
              </div>

              {/* ✅ NOVO: Comportamento em Desconexão */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Comportamento em Desconexão
                </label>
                <select
                  value={fallbackBehavior}
                  onChange={(e) => setFallbackBehavior(e.target.value as 'pause' | 'switch_to_reserve')}
                  className={`w-full px-4 py-2 border-b transition-all ${
                    isDark
                      ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] [&>option]:bg-zinc-900 [&>option]:text-white'
                      : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                  } focus:outline-none`}
                  disabled={reserveInboxIds.length === 0}
                >
                  <option value="pause" className={isDark ? 'bg-zinc-900 text-white' : ''}>
                    Pausar campanha
                  </option>
                  <option value="switch_to_reserve" className={isDark ? 'bg-zinc-900 text-white' : ''}>
                    Trocar para número reserva automaticamente
                  </option>
                </select>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  {fallbackBehavior === 'pause'
                    ? 'A campanha será pausada se o número principal desconectar'
                    : 'A campanha continuará usando os números reserva se o principal desconectar'
                  }
                  {reserveInboxIds.length === 0 && fallbackBehavior === 'switch_to_reserve' && (
                    <span className="block text-yellow-500 mt-1">
                      ⚠️ Configure ao menos 1 número reserva para usar este comportamento
                    </span>
                  )}
                </p>
              </div>

              {/* Seção: Funil */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Funil
                </label>
                <select
                  value={funnelId}
                  onChange={(e) => handleFunnelChange(e.target.value)}
                  className={`w-full px-4 py-2 border-b transition-all ${
                    isDark 
                      ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' 
                      : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                  } focus:outline-none`}
                >
                  <option value="">Selecione um funil...</option>
                  {funnels.map(funnel => (
                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                  ))}
                </select>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Funil de vendas com os leads
                </p>
              </div>

              {/* 2 Colunas: Origem e Destino */}
              <div className="grid grid-cols-2 gap-6">
                {/* Coluna de Origem */}
                <div>
                  <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    Coluna de Origem
                  </label>
                  <select
                    value={sourceColumnId}
                    onChange={(e) => setSourceColumnId(e.target.value)}
                    disabled={!funnelId || columns.length === 0}
                    className={`w-full px-4 py-2 border-b transition-all ${
                      isDark 
                        ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] disabled:opacity-40' 
                        : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9] disabled:opacity-40'
                    } focus:outline-none`}
                  >
                    <option value="">Selecione uma coluna...</option>
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Leads desta coluna receberão mensagens
                  </p>
                </div>

                {/* Coluna de Destino */}
                <div>
                  <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    Coluna de Destino
                  </label>
                  <select
                    value={targetColumnId}
                    onChange={(e) => setTargetColumnId(e.target.value)}
                    disabled={!funnelId || columns.length === 0}
                    className={`w-full px-4 py-2 border-b transition-all ${
                      isDark 
                        ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] disabled:opacity-40' 
                        : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9] disabled:opacity-40'
                    } focus:outline-none`}
                  >
                    <option value="">Selecione uma coluna...</option>
                    {columns.filter(c => c.id !== sourceColumnId).map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Leads movidos aqui após envio
                  </p>
                </div>
              </div>

              {/* Instruções para I.A - Full Width */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Instruções para Geração de Mensagens (System Prompt)
                </label>
                <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  A IA usará estas instruções + dados completos do lead para gerar mensagens personalizadas
                </p>
                <textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={8}
                  placeholder={`Você é o Assistente de Vendas da Agência XYZ, especialista em marketing digital.

OBJETIVO:
Gerar mensagens de primeiro contato que despertem interesse genuíno.

ESTILO:
- Seja casual mas profissional
- Use no máximo 2 emojis
- Máximo 3 parágrafos curtos

ESTRATÉGIA:
- Mencione algo específico sobre a empresa do lead
- Apresente um benefício claro que seu serviço oferece
- Termine com uma pergunta que gere curiosidade

NUNCA:
- Use "Prezado", "Caro", "Estimado"
- Mencione que é uma mensagem automática
- Use mais de 500 caracteres`}
                  className={`w-full px-4 py-2.5 border-b transition-all resize-none font-mono text-sm ${
                    isDark 
                      ? 'bg-black border-white/[0.2] text-white placeholder:text-white/30 focus:bg-white/[0.1] focus:border-[#0169D9]' 
                      : 'bg-white border border-border-light text-text-primary-light placeholder:text-gray-400 focus:border-[#0169D9]'
                  } focus:outline-none`}
                />
              </div>

              {/* Dividir Mensagens Longas - Grid 2 Colunas */}
              <div className={`p-4 rounded-lg border ${
                isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-light-elevated border-border-light'
              }`}>
                <div className="grid grid-cols-2 gap-6">
                  {/* Coluna 1: Switcher */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className={`block font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        Dividir mensagens longas
                      </label>
                      <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Mensagens acima de 500 caracteres serão automaticamente divididas
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={splitMessages}
                      onClick={() => setSplitMessages(!splitMessages)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0169D9] focus:ring-offset-2 ml-4 ${
                        splitMessages ? 'bg-[#0169D9]' : isDark ? 'bg-white/20' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          splitMessages ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Coluna 2: Número Máximo de Partes */}
                  <div>
                    <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                      Número máximo de partes
                    </label>
                    <input
                      type="number"
                      value={maxSplitParts}
                      onChange={(e) => setMaxSplitParts(Number(e.target.value))}
                      min="1"
                      max="5"
                      disabled={!splitMessages}
                      className={`w-full px-4 py-2 border-b transition-all ${
                        isDark 
                          ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] disabled:opacity-40' 
                          : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9] disabled:opacity-40'
                      } focus:outline-none`}
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Mínimo: 1 | Máximo: 5
                    </p>
                  </div>
                </div>
              </div>

              {/* Alertas de Validação */}
              {validationErrors.length > 0 && (
                <div className="p-4 border border-red-500/20 rounded-lg bg-red-500/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-red-500 font-medium mb-2">Erros de Validação</h4>
                      <ul className="space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm text-red-400">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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
                      <th className="px-6 py-3 text-left font-medium">Taxa de Sucesso</th>
                      <th className="px-6 py-3 text-center font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${
                    isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light'
                  }`}>
                    {loadingRuns ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                            <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                              Carregando...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : campaignRuns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <p className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                            Nenhuma campanha realizada ainda
                          </p>
                        </td>
                      </tr>
                    ) : (
                      campaignRuns.map((run) => {
                        const responseRate = run.leads_success > 0 
                          ? Math.round((run.replied_count / run.leads_success) * 100) 
                          : 0;
                        
                        return (
                          <tr key={run.id} className={`transition-all ${
                            isDark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'hover:bg-light-elevated/50'
                          }`}>
                            {/* Data/Hora */}
                            <td className={`px-6 py-3 whitespace-nowrap ${
                              isDark ? 'text-white/70' : 'text-text-primary-light'
                            }`}>
                              <div className="font-medium">
                                {/* Parse run_date como string local (YYYY-MM-DD) sem conversão de timezone */}
                                {run.run_date.split('-').reverse().join('/')}
                              </div>
                              <div className={`text-xs ${
                                isDark ? 'text-white/40' : 'text-text-secondary-light'
                              }`}>
                                {format(new Date(run.started_at), 'HH:mm', { locale: ptBR })}
                              </div>
                            </td>

                            {/* Campanha */}
                            <td className={`px-6 py-3 whitespace-nowrap ${
                              isDark ? 'text-white/70' : 'text-text-primary-light'
                            }`}>
                              {run.name || 'Campanha'}
                            </td>

                            {/* Leads */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{run.leads_success}</span>
                                <span className="text-gray-500">/ {run.leads_total}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              {run.status === 'completed' && (
                                <Badge className="bg-green-500/20 text-green-400">
                                  ✓ Concluído
                                </Badge>
                              )}
                              {run.status === 'running' && (
                                <Badge className="bg-blue-500/20 text-blue-400">
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  Em andamento
                                </Badge>
                              )}
                              {run.status === 'failed' && (
                                <Badge className="bg-red-500/20 text-red-400">
                                  ✗ Falhou
                                </Badge>
                              )}
                              {run.status !== 'completed' && run.status !== 'running' && run.status !== 'failed' && (
                                <Badge className="bg-gray-500/20 text-gray-400">
                                  {run.status}
                                </Badge>
                              )}
                            </td>

                            {/* Taxa de Sucesso */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              <Badge className={
                                responseRate >= 20
                                  ? 'bg-green-500/20 text-green-400'
                                  : responseRate >= 10
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-gray-500/20 text-gray-400'
                              }>
                                ✓ {responseRate}%
                                respostas
                              </Badge>
                            </td>

                            {/* Ações */}
                            <td className="px-6 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenRunDetails(run.id)}
                                  className="px-3 py-1 text-sm rounded-lg bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
                                >
                                  Detalhes
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteRunId(run.id)}
                                  disabled={deletingRunId === run.id || (run.leads_processed === run.leads_total && run.leads_total > 0)}
                                  className={`px-2 py-1 text-sm rounded-lg transition-colors ${
                                    deletingRunId === run.id
                                      ? 'bg-red-500/50 cursor-not-allowed'
                                      : (run.leads_processed === run.leads_total && run.leads_total > 0)
                                      ? 'bg-zinc-500/20 cursor-not-allowed text-zinc-500'
                                      : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                  }`}
                                  title={
                                    (run.leads_processed === run.leads_total && run.leads_total > 0)
                                      ? 'Campanhas 100% concluídas não podem ser deletadas'
                                      : 'Deletar campanha'
                                  }
                                >
                                  {deletingRunId === run.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
                    Mostrando <span className="font-medium">{startIndex + 1} - {Math.min(endIndex, totalRuns)}</span> de <span className="font-medium">{totalRuns}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        currentPage === 1
                          ? isDark ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
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
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? isDark ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
                          : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                      }`}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {confirmDeleteRunId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${
            isDark ? 'bg-[#1a1a1a] border border-white/[0.08]' : 'bg-white border border-border-light'
          }`}>
            <div className={`px-6 py-4 border-b ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <h3 className={`font-medium ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Confirmar Exclusão
              </h3>
            </div>
            
            <div className="px-6 py-4">
              <p className={isDark ? 'text-white/70' : 'text-text-primary-light'}>
                Tem certeza que deseja deletar esta campanha? Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <button
                onClick={() => setConfirmDeleteRunId(null)}
                disabled={deletingRunId === confirmDeleteRunId}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white'
                    : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteCampaign(confirmDeleteRunId)}
                disabled={deletingRunId === confirmDeleteRunId}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingRunId === confirmDeleteRunId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deletando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Deletar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}