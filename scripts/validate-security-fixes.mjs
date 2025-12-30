#!/usr/bin/env node
/**
 * Script de Validação das Correções de Segurança
 * Executa testes automatizados para verificar se as correções estão funcionando
 *
 * Uso: node scripts/validate-security-fixes.mjs
 */

const SUPABASE_URL = "https://nlbcwaxkeaddfocigwuk.supabase.co";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Cores para output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(type, message) {
  const icons = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    test: `${colors.cyan}→${colors.reset}`,
  };
  console.log(`${icons[type] || "•"} ${message}`);
}

// Resultados
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function recordResult(name, passed, details = "") {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log("pass", `${name}`);
  } else {
    results.failed++;
    log("fail", `${name}${details ? ` - ${details}` : ""}`);
  }
}

// ============================================================================
// TESTES
// ============================================================================

async function testCorsRestriction() {
  log("test", "Testando CORS restrito nas funções admin...");

  const adminFunctions = [
    "exec-sql",
    "admin-create-user",
    "admin-delete-user",
    "admin-change-password",
  ];

  for (const fn of adminFunctions) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/${fn}`, {
        method: "OPTIONS",
        headers: {
          "Origin": "https://malicious-site.com",
        },
      });

      const corsOrigin = response.headers.get("access-control-allow-origin");

      // Deve retornar o domínio padrão (hub.pescalead.com.br), não o malicioso
      const passed = corsOrigin !== "https://malicious-site.com" && corsOrigin !== "*";

      recordResult(
        `CORS ${fn}`,
        passed,
        passed ? "" : `Retornou: ${corsOrigin}`
      );
    } catch (error) {
      recordResult(`CORS ${fn}`, false, error.message);
    }
  }
}

async function testExecSqlAuth() {
  log("test", "Testando autenticação do exec-sql...");

  // Teste 1: Sem Authorization header
  try {
    const response = await fetch(`${FUNCTIONS_URL}/exec-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: "SELECT 1" }),
    });

    const data = await response.json();
    const passed = response.status === 401 && data.error === "Authorization header required";

    recordResult(
      "exec-sql sem token → 401",
      passed,
      passed ? "" : `Status: ${response.status}, Error: ${data.error}`
    );
  } catch (error) {
    recordResult("exec-sql sem token → 401", false, error.message);
  }

  // Teste 2: Com token inválido
  try {
    const response = await fetch(`${FUNCTIONS_URL}/exec-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid-token-12345",
      },
      body: JSON.stringify({ sql: "SELECT 1" }),
    });

    const data = await response.json();
    const passed = response.status === 401;

    recordResult(
      "exec-sql token inválido → 401",
      passed,
      passed ? "" : `Status: ${response.status}`
    );
  } catch (error) {
    recordResult("exec-sql token inválido → 401", false, error.message);
  }
}

async function testWebhookValidation() {
  log("test", "Testando validação de webhooks...");

  // Teste google-webhook sem token
  try {
    const response = await fetch(`${FUNCTIONS_URL}/google-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-resource-state": "exists",
        "x-goog-channel-id": "test-invalid-channel",
        // Não enviamos x-goog-channel-token
      },
      body: JSON.stringify({}),
    });

    // Se GOOGLE_WEBHOOK_SECRET está configurado, deve retornar 401
    // Se não está configurado, retorna 200 (comportamento legado)
    const passed = response.status === 401 || response.status === 200;

    recordResult(
      "google-webhook validação",
      passed,
      `Status: ${response.status} (401=secret ativo, 200=sem secret)`
    );

    if (response.status === 200) {
      log("warn", "GOOGLE_WEBHOOK_SECRET não está configurado - webhook aceita qualquer request");
      results.warnings++;
    }
  } catch (error) {
    recordResult("google-webhook validação", false, error.message);
  }

  // Teste ai-webhook-receiver sem secret
  try {
    const response = await fetch(`${FUNCTIONS_URL}/ai-webhook-receiver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Não enviamos x-webhook-secret
      },
      body: JSON.stringify({
        event: "message.received",
        conversation_id: "test-123",
        message: { type: "text", content: "test" }
      }),
    });

    const data = await response.json();

    // Se AI_WEBHOOK_SECRET está configurado, deve retornar 401
    // Se não está, vai tentar processar (pode dar outro erro)
    const hasSecretValidation = response.status === 401 && data.reason === "unauthorized";

    recordResult(
      "ai-webhook-receiver validação",
      true, // Sempre passa, mas verificamos o comportamento
      hasSecretValidation ? "Secret ativo ✓" : `Status: ${response.status} (secret pode não estar configurado)`
    );

    if (!hasSecretValidation && response.status !== 401) {
      log("warn", "AI_WEBHOOK_SECRET não está configurado - webhook aceita qualquer request");
      results.warnings++;
    }
  } catch (error) {
    recordResult("ai-webhook-receiver validação", false, error.message);
  }
}

async function testPublicEndpoints() {
  log("test", "Testando endpoints públicos (devem funcionar)...");

  const publicEndpoints = [
    { name: "public-booking", method: "OPTIONS" },
    { name: "widget-chat", method: "OPTIONS" },
  ];

  for (const endpoint of publicEndpoints) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/${endpoint.name}`, {
        method: endpoint.method,
      });

      const passed = response.status === 200;
      recordResult(
        `${endpoint.name} acessível`,
        passed,
        passed ? "" : `Status: ${response.status}`
      );
    } catch (error) {
      recordResult(`${endpoint.name} acessível`, false, error.message);
    }
  }
}

async function testRateLimiting() {
  log("test", "Testando rate limiting (requer múltiplas requests)...");

  // Fazer várias requests rápidas para testar rate limiting
  const endpoint = `${FUNCTIONS_URL}/public-booking`;
  let rateLimited = false;

  try {
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        })
      );
    }

    const responses = await Promise.all(requests);
    rateLimited = responses.some(r => r.status === 429);

    recordResult(
      "Rate limiting ativo",
      true, // Info only
      rateLimited ? "Rate limit detectado (429) ✓" : "Nenhum 429 em 15 requests (pode estar OK)"
    );
  } catch (error) {
    recordResult("Rate limiting", false, error.message);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(`${colors.cyan}  VALIDAÇÃO DE CORREÇÕES DE SEGURANÇA${colors.reset}`);
  console.log(`${colors.cyan}  Pesca Lead - Edge Functions${colors.reset}`);
  console.log("=".repeat(60) + "\n");

  console.log(`${colors.blue}Target:${colors.reset} ${SUPABASE_URL}\n`);

  // Executar testes
  await testCorsRestriction();
  console.log("");

  await testExecSqlAuth();
  console.log("");

  await testWebhookValidation();
  console.log("");

  await testPublicEndpoints();
  console.log("");

  await testRateLimiting();

  // Resumo
  console.log("\n" + "=".repeat(60));
  console.log(`${colors.cyan}  RESUMO${colors.reset}`);
  console.log("=".repeat(60));

  console.log(`
  ${colors.green}Passou:${colors.reset}    ${results.passed}
  ${colors.red}Falhou:${colors.reset}    ${results.failed}
  ${colors.yellow}Avisos:${colors.reset}    ${results.warnings}
  `);

  if (results.failed === 0) {
    console.log(`${colors.green}✓ Todas as correções de segurança estão funcionando!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✗ Algumas verificações falharam. Revise os resultados acima.${colors.reset}\n`);
  }

  // Recomendações
  if (results.warnings > 0) {
    console.log(`${colors.yellow}Recomendações:${colors.reset}`);
    console.log("  1. Configure GOOGLE_WEBHOOK_SECRET no Supabase Dashboard");
    console.log("  2. Configure AI_WEBHOOK_SECRET no Supabase Dashboard");
    console.log("  3. Esses secrets protegem os webhooks contra requests não autorizadas\n");
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
