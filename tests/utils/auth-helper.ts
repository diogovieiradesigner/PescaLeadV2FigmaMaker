/**
 * Helper para autenticação nos testes
 */

export async function login(page: any, email: string, password: string) {
  await page.goto('/');
  
  // Aguardar página de login ou verificar se já está logado
  const loginForm = page.locator('form').or(page.locator('input[type="email"]'));
  
  if (await loginForm.count() > 0) {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento
    await page.waitForURL('**/pipeline**', { timeout: 10000 });
  }
}

export async function waitForAuth(page: any) {
  // Aguardar autenticação (ajustar conforme necessário)
  await page.waitForTimeout(2000);
  
  // Verificar se há token no localStorage
  const token = await page.evaluate(() => localStorage.getItem('supabase_auth_token'));
  
  if (!token) {
    console.log('⚠️ Usuário não autenticado - alguns testes podem falhar');
  }
}

