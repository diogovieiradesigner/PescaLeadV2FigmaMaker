/**
 * Função auxiliar para parsing de resposta de split de mensagem
 * Extraída para melhorar manutenibilidade
 */

export interface ParseSplitResult {
  messages: string[];
  valid: boolean;
  error?: string;
}

const MAX_PART_LENGTH = 1000; // Máximo de caracteres por parte

export function parseSplitResponse(
  responseText: string,
  maxParts: number,
  originalMessage: string
): ParseSplitResult {
  try {
    // Limpar markdown code blocks
    const cleanResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Parsear JSON
    const parsed = JSON.parse(cleanResponse);
    
    // Validar estrutura
    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      return {
        messages: [originalMessage],
        valid: false,
        error: 'Invalid response format: messages array not found'
      };
    }
    
    // Filtrar e validar mensagens
    const validMessages = parsed.messages
      .filter((m: any) => m && typeof m === 'string' && m.trim().length > 0)
      .map((m: string) => m.trim())
      .filter((m: string) => m.length <= MAX_PART_LENGTH) // Validar tamanho máximo
      .slice(0, maxParts);
    
    if (validMessages.length === 0) {
      return {
        messages: [originalMessage],
        valid: false,
        error: 'No valid messages found in response'
      };
    }
    
    return {
      messages: validMessages,
      valid: true
    };
    
  } catch (parseError: any) {
    return {
      messages: [originalMessage],
      valid: false,
      error: `Parse error: ${parseError.message}`
    };
  }
}

