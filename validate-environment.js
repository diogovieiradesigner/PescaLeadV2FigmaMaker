#!/usr/bin/env node

/**
 * Script de Validação de Ambiente para Testes CNPJ
 * 
 * Este script verifica se o ambiente está configurado corretamente
 * para executar os testes de validação de filtros CNPJ.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

console.log('🔍 Validando Ambiente para Testes CNPJ');
console.log('='.repeat(50));

const checks = [];
let passedChecks = 0;

function check(name, condition, message) {
  checks.push({ name, condition, message });
  if (condition) {
    passedChecks++;
    console.log(`✅ ${name}: ${message}`);
  } else {
    console.log(`❌ ${name}: ${message}`);
  }
}

// 1. Verificar Node.js
check(
  'Node.js',
  process.version,
  `Versão: ${process.version}`
);

// 2. Verificar dependências
try {
  require('node-fetch');
  check('node-fetch', true, 'Dependência instalada');
} catch (error) {
  check('node-fetch', false, 'Dependência não instalada - execute: npm install node-fetch@2');
}

// 3. Verificar arquivos de teste
const testFiles = [
  'test-cnpj-filters.js',
  'quick-test-cnpj.js',
  'README-TESTES-CNPJ.md',
  'run-cnpj-tests.sh'
];

testFiles.forEach(file => {
  const exists = fs.existsSync(file);
  check(
    `Arquivo ${file}`,
    exists,
    exists ? 'Arquivo presente' : 'Arquivo ausente'
  );
});

// 4. Verificar variáveis de ambiente
const envVars = {
  API_BASE_URL: process.env.API_BASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
};

Object.entries(envVars).forEach(([key, value]) => {
  check(
    `Variável ${key}`,
    value && value.length > 0,
    value ? 'Configurada' : 'Não configurada'
  );
});

// 5. Verificar arquivo .env
const envFileExists = fs.existsSync('.env');
if (envFileExists) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasApiUrl = envContent.includes('API_BASE_URL');
  const hasSupabaseUrl = envContent.includes('SUPABASE_URL');
  const hasAnonKey = envContent.includes('SUPABASE_ANON_KEY');
  
  check('Arquivo .env', true, 'Presente');
  check('API_BASE_URL no .env', hasApiUrl, hasApiUrl ? 'Configurada' : 'Ausente');
  check('SUPABASE_URL no .env', hasSupabaseUrl, hasSupabaseUrl ? 'Configurada' : 'Ausente');
  check('SUPABASE_ANON_KEY no .env', hasAnonKey, hasAnonKey ? 'Configurada' : 'Ausente');
} else {
  check('Arquivo .env', false, 'Não encontrado');
}

// 6. Testar conexão com API (se configurada)
if (envVars.API_BASE_URL) {
  console.log('\n📡 Testando conexão com API...');
  const testUrl = `${envVars.API_BASE_URL}/health`;
  
  fetch(testUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': envVars.SUPABASE_ANON_KEY || 'test-key'
    }
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  })
  .then(data => {
    const isHealthy = data.status === 'healthy';
    check('Conexão com API', isHealthy, isHealthy ? 'API saudável' : 'API não saudável');
    console.log(`   Status: ${data.status || 'desconhecido'}`);
    console.log(`   Banco: ${data.database || 'desconhecido'}`);
  })
  .catch(error => {
    check('Conexão com API', false, `Falha na conexão: ${error.message}`);
  });
} else {
  check('Conexão com API', false, 'URL da API não configurada');
}

// 7. Verificar permissões de execução (Unix-like)
if (process.platform !== 'win32') {
  const scriptFiles = ['run-cnpj-tests.sh'];
  scriptFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const isExecutable = !!(stats.mode & parseInt('111', 8));
      check(`Permissão de execução ${file}`, isExecutable, isExecutable ? 'Permitida' : 'Negada');
    }
  });
}

// Resumo
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA VALIDAÇÃO');
  console.log('='.repeat(50));
  console.log(`Total de verificações: ${checks.length}`);
  console.log(`Aprovadas: ${passedChecks}`);
  console.log(`Falhadas: ${checks.length - passedChecks}`);
  console.log(`Taxa de sucesso: ${((passedChecks / checks.length) * 100).toFixed(1)}%`);

  if (passedChecks === checks.length) {
    console.log('\n✅ Ambiente totalmente configurado!');
    console.log('   Você pode executar os testes com:');
    console.log('   node test-cnpj-filters.js');
    console.log('   ou');
    console.log('   ./run-cnpj-tests.sh');
  } else {
    console.log('\n⚠️  Ambiente parcialmente configurado.');
    console.log('   Siga as recomendações acima para corrigir os problemas.');
  }

  console.log('\n💡 Dicas:');
  console.log('   • Configure as variáveis de ambiente no .env');
  console.log('   • Instale dependências com: npm install');
  console.log('   • Teste a conexão com a API antes de executar os testes');
  console.log('   • Consulte o README-TESTES-CNPJ.md para mais informações');

  console.log('='.repeat(50));
}, 1000);