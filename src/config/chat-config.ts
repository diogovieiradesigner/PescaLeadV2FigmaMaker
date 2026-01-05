export interface ChatConfig {
  defaultModelId: string;
  defaultSystemMessage: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultTitle: string;
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  defaultModelId: 'llama-3.2-1b-instruct',
  defaultSystemMessage: 'Você é um assistente útil treinado para responder em português do Brasil. Seja conciso e direto.',
  defaultTemperature: 0.7,
  defaultMaxTokens: 500,
  defaultTitle: 'Nova Conversa',
};

export const TEMPERATURE_PRESETS = {
  precise: { value: 0.3, label: 'Preciso' },
  balanced: { value: 0.7, label: 'Balanceado' },
  creative: { value: 1.2, label: 'Criativo' },
};
