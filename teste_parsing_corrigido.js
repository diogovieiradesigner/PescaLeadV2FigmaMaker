/**
 * Versão corrigida da função parseLocalizacao
 * Corrige problema com strings como "Paraiba, Paraiba, Brazil"
 */

function parseLocalizacaoCorrigida(localizacao) {
  if (!localizacao) return {};

  // Normalizar: remover acentos e lowercase
  const normalizado = localizacao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/state of /gi, '') // Remover "State of" que pode vir do frontend
    .replace(/^cnpj\s*-\s*/i, '') // Remover prefixo "CNPJ - " do início
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

  // NOVA LÓGICA: Primeiro, identificar todas as possíveis UFs
  const ufsEncontradas = [];
  const naoUfs = [];

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    
    // Verificar se é uma sigla de UF
    if (parte.length === 2 && UFS_VALIDAS.has(parte.toUpperCase())) {
      ufsEncontradas.push({ parte, uf: parte.toUpperCase(), tipo: 'sigla' });
      continue;
    }

    // Verificar se é nome de estado
    if (ESTADO_PARA_UF[parte]) {
      ufsEncontradas.push({ parte, uf: ESTADO_PARA_UF[parte], tipo: 'nome' });
      continue;
    }

    // Não é UF, é possível município
    naoUfs.push(parte);
  }

  console.log(`🔍 [DEBUG] UFs encontradas:`, ufsEncontradas);
  console.log(`🔍 [DEBUG] Partes que não são UF:`, naoUfs);

  // Se temos exatamente 1 UF encontrada, ela é o estado
  if (ufsEncontradas.length === 1) {
    uf = ufsEncontradas[0].uf;
    console.log(`✅ [DEBUG] UF definida: ${uf}`);

    // Se temos partes que não são UF, a primeira pode ser município
    if (naoUfs.length > 0) {
      municipio_nome = naoUfs[0]
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      console.log(`✅ [DEBUG] Município definido: "${municipio_nome}"`);
    }
  } 
  // Se temos 2+ partes iguais e são UFs (ex: "paraiba, paraiba")
  else if (ufsEncontradas.length >= 2) {
    // Usar a primeira parte como município (caso específico de município = estado)
    // E a segunda como UF
    const primeiraParte = partes[0];
    
    // Verificar se a primeira parte corresponde a uma UF
    const ufMatch = ufsEncontradas.find(u => u.parte === primeiraParte);
    if (ufMatch) {
      uf = ufMatch.uf;
      
      // Se há mais de 2 partes, usar a penúltima como município
      if (partes.length >= 3) {
        municipio_nome = partes[partes.length - 2]
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else {
        // Se há apenas 2 partes iguais, a primeira pode ser município com mesmo nome do estado
        municipio_nome = primeiraParte
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      console.log(`✅ [DEBUG] UF (caso especial): ${uf}`);
      console.log(`✅ [DEBUG] Município (caso especial): "${municipio_nome}"`);
    }
  }
  // Se temos 0 UFs, tentar lógica original (menos robusta)
  else {
    // Fallback para lógica original (menos robusta)
    for (let i = partes.length - 1; i >= 0; i--) {
      const parte = partes[i];

      // Verificar se é uma sigla de UF
      if (parte.length === 2 && UFS_VALIDAS.has(parte.toUpperCase())) {
        uf = parte.toUpperCase();
        continue;
      }

      // Verificar se é nome de estado
      if (ESTADO_PARA_UF[parte]) {
        uf = ESTADO_PARA_UF[parte];
        continue;
      }

      // Se ainda não temos município, assumir que é o nome da cidade
      if (!municipio_nome && parte.length > 2) {
        municipio_nome = parte
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
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
  "Campina Grande, Paraiba, Brazil",
  "Paraiba, Paraiba", // Caso especial
  "CNPJ - Paraiba, Paraiba, Brazil"
];

console.log('=== TESTE DE PARSING CORRIGIDO ===\n');

casosTeste.forEach((caso, index) => {
  console.log(`\n--- TESTE ${index + 1}: "${caso}" ---`);
  const resultado = parseLocalizacaoCorrigida(caso);
  console.log(`📍 Resultado final:`, resultado);
});