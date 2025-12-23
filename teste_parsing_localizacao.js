/**
 * Teste para validar o parsing de localização do CNPJ
 * Identifica problema com strings como "Paraiba, Paraiba, Brazil"
 */

// Função de parsing atual (copiada do código)
function parseLocalizacao(localizacao) {
  if (!localizacao) return {};

  // Normalizar: remover acentos e lowercase
  const normalizado = localizacao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/state of /gi, '') // Remover "State of" que pode vir do frontend
    .toLowerCase()
    .trim();

  // Dividir por vírgula (ignorar país em português ou inglês)
  const partes = normalizado.split(',').map(p => p.trim()).filter(p => p && p !== 'brasil' && p !== 'brazil');

  if (partes.length === 0) return {};

  let uf;
  let municipio_nome;

  // Mapeamento de estados
  const ESTADO_PARA_UF = {
    'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM',
    'bahia': 'BA', 'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
    'goias': 'GO', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
    'minas gerais': 'MG', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
    'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
    'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
    'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO'
  };

  const UFS_VALIDAS = new Set(Object.values(ESTADO_PARA_UF));

  console.log(`🔍 [DEBUG] Parsing: "${localizacao}"`);
  console.log(`🔍 [DEBUG] Normalizado: "${normalizado}"`);
  console.log(`🔍 [DEBUG] Partes:`, partes);

  // Tentar identificar UF e município
  for (let i = partes.length - 1; i >= 0; i--) {
    const parte = partes[i];

    console.log(`🔍 [DEBUG] Verificando parte ${i}: "${parte}"`);

    // Verificar se é uma sigla de UF
    if (parte.length === 2 && UFS_VALIDAS.has(parte.toUpperCase())) {
      uf = parte.toUpperCase();
      console.log(`✅ [DEBUG] UF encontrada (sigla): ${uf}`);
      continue;
    }

    // Verificar se é nome de estado
    if (ESTADO_PARA_UF[parte]) {
      uf = ESTADO_PARA_UF[parte];
      console.log(`✅ [DEBUG] UF encontrada (nome): ${uf} a partir de "${parte}"`);
      continue;
    }

    // Se ainda não temos município, assumir que é o nome da cidade
    if (!municipio_nome && parte.length > 2) {
      // Capitalizar para busca
      municipio_nome = parte
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      console.log(`✅ [DEBUG] Município definido: "${municipio_nome}"`);
    }
  }

  // Se só temos uma parte e é nome de estado, não é município
  if (partes.length === 1 && uf && !municipio_nome) {
    console.log(`⚠️ [DEBUG] Apenas UF definida, sem município`);
    return { uf };
  }

  const resultado = { uf, municipio_nome };
  console.log(`📍 [RESULTADO]:`, resultado);
  return resultado;
}

// Casos de teste problemáticos
const casosTeste = [
  "Paraiba, Paraiba, Brazil",
  "CNPJ - Joao Pessoa, Paraiba, Brazil", 
  "João Pessoa, Paraíba, Brasil",
  "Paraiba, Brazil",
  "PB, Brazil",
  "Campina Grande, Paraiba, Brazil"
];

console.log('=== TESTE DE PARSING DE LOCALIZAÇÃO CNPJ ===\n');

casosTeste.forEach((caso, index) => {
  console.log(`\n--- TESTE ${index + 1}: "${caso}" ---`);
  const resultado = parseLocalizacao(caso);
  console.log(`📍 Resultado final:`, resultado);
});