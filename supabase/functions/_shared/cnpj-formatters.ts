// =============================================================================
// CNPJ FORMATTERS - Funções utilitárias de formatação para dados CNPJ
// =============================================================================

/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY
 * @param date Data no formato YYYY-MM-DD ou objeto Date
 * @returns Data formatada no formato DD/MM/YYYY ou null se inválida
 */
export function formatDateToDDMMYYYY(date: string | Date | null | undefined): string | null {
  if (!date) return null;

  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else {
      // Se for string, tentar parsear
      const dateStr = String(date);
      
      // Se já estiver no formato DD/MM/YYYY, retornar como está
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
      }
      
      // Se estiver no formato YYYY-MM-DD, converter
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateObj = new Date(dateStr);
      } else {
        // Tentar criar data diretamente
        dateObj = new Date(dateStr);
      }
    }
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('[formatDateToDDMMYYYY] Erro ao formatar data:', error);
    return null;
  }
}

/**
 * Formata um número de telefone no formato (XX) XXXXX-XXXX
 * @param phone Número de telefone (pode incluir DDD)
 * @returns Telefone formatado ou null se inválido
 */
export function formatPhoneToBrazilian(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  try {
    // Remover todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar se tem tamanho válido (8 ou 9 dígitos para o número + 2 para DDD)
    if (cleanPhone.length < 8 || cleanPhone.length > 11) {
      return null;
    }
    
    let ddd = '';
    let number = cleanPhone;
    
    // Se tiver 10 ou 11 dígitos, assumir que os primeiros 2 são DDD
    if (cleanPhone.length >= 10) {
      ddd = cleanPhone.substring(0, 2);
      number = cleanPhone.substring(2);
    }
    
    // Formatar número (8 ou 9 dígitos)
    if (number.length === 8) {
      // Telefone fixo: XXXX-XXXX
      return ddd ? `(${ddd}) ${number.substring(0, 4)}-${number.substring(4)}` : `${number.substring(0, 4)}-${number.substring(4)}`;
    } else if (number.length === 9) {
      // Celular: XXXXX-XXXX
      return ddd ? `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}` : `${number.substring(0, 5)}-${number.substring(5)}`;
    }
    
    // Se não corresponder aos padrões, retornar como está
    return phone;
  } catch (error) {
    console.error('[formatPhoneToBrazilian] Erro ao formatar telefone:', error);
    return null;
  }
}

/**
 * Formata um CNPJ no formato XX.XXX.XXX/XXXX-XX
 * @param cnpj Número do CNPJ
 * @returns CNPJ formatado ou null se inválido
 */
export function formatCNPJ(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  
  try {
    // Remover todos os caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verificar se tem 14 dígitos
    if (cleanCNPJ.length !== 14) {
      return null;
    }
    
    // Formatar: XX.XXX.XXX/XXXX-XX
    return `${cleanCNPJ.substring(0, 2)}.${cleanCNPJ.substring(2, 5)}.${cleanCNPJ.substring(5, 8)}/${cleanCNPJ.substring(8, 12)}-${cleanCNPJ.substring(12, 14)}`;
  } catch (error) {
    console.error('[formatCNPJ] Erro ao formatar CNPJ:', error);
    return null;
  }
}

/**
 * Formata um valor monetário como R$ X.XXX,XX
 * @param value Valor numérico ou string representando um número
 * @returns Valor formatado como moeda brasileira ou null se inválido
 */
export function formatCurrencyBRL(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  
  try {
    let numericValue: number;
    
    if (typeof value === 'string') {
      // Tentar converter string para número
      // Substituir vírgula por ponto para parsear corretamente
      const normalizedValue = value.replace(/\./g, '').replace(',', '.');
      numericValue = parseFloat(normalizedValue);
    } else {
      numericValue = value;
    }
    
    // Verificar se é um número válido
    if (isNaN(numericValue)) {
      return null;
    }
    
    // Formatar como moeda brasileira
    return numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  } catch (error) {
    console.error('[formatCurrencyBRL] Erro ao formatar moeda:', error);
    return null;
  }
}

/**
 * Formata um CEP no formato XXXXX-XXX
 * @param cep Número do CEP
 * @returns CEP formatado ou null se inválido
 */
export function formatCEP(cep: string | null | undefined): string | null {
  if (!cep) return null;
  
  try {
    // Remover todos os caracteres não numéricos
    const cleanCEP = cep.replace(/\D/g, '');
    
    // Verificar se tem 8 dígitos
    if (cleanCEP.length !== 8) {
      return null;
    }
    
    // Formatar: XXXXX-XXX
    return `${cleanCEP.substring(0, 5)}-${cleanCEP.substring(5, 8)}`;
  } catch (error) {
    console.error('[formatCEP] Erro ao formatar CEP:', error);
    return null;
  }
}

// Exportar todas as funções como objeto para facilitar importação
export const cnpjFormatters = {
  formatDateToDDMMYYYY,
  formatPhoneToBrazilian,
  formatCNPJ,
  formatCurrencyBRL,
  formatCEP
};