/**
 * Normaliza localização removendo acentos e padronizando formato
 * para funcionar com a API Serper.dev
 * 
 * @example
 * normalizeLocation("João Pessoa, Paraíba, Brasil")
 * // "Joao Pessoa, State of Paraiba, Brazil"
 */
export function normalizeLocation(location: string): string {
  return location
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/Brasil/gi, 'Brazil')   // Padronizar país
    .replace(/Estado de /gi, 'State of ') // Padronizar estado
    .trim();
}

/**
 * Valida se a localização está em formato válido
 */
export function isValidLocation(location: string): boolean {
  if (!location || location.trim().length < 3) {
    return false;
  }
  
  // Deve ter pelo menos uma vírgula (cidade, estado ou cidade, país)
  return location.includes(',');
}

/**
 * Sugestões de formato de localização
 */
export const LOCATION_EXAMPLES = [
  'João Pessoa, Paraíba',
  'São Paulo, SP',
  'Rio de Janeiro, Brasil',
  'Recife, Pernambuco, Brazil',
  'Fortaleza, Ceará'
];
