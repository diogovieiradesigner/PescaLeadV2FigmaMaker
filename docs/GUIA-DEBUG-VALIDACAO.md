# 🚀 Guia de Debug e Validação Rápida

## 📋 Visão Geral

Este guia explica como usar **Playwright** e **scripts automatizados** para validar mudanças no frontend de forma rápida e eficiente.

---

## 🎯 Estratégia de Validação

### **1. Validação Visual Automatizada**
- Screenshots automáticos após mudanças
- Comparação visual de componentes
- Validação de layout e responsividade

### **2. Testes E2E**
- Testes automatizados do fluxo completo
- Validação de funcionalidades críticas
- Detecção de regressões

### **3. Debug Interativo**
- Modo debug do Playwright
- UI interativa para testes
- Inspeção de elementos em tempo real

---

## 🚀 Setup Inicial

### **1. Instalar Dependências**

```bash
npm install
```

Isso instalará:
- `@playwright/test` - Framework de testes
- Dependências do frontend

### **2. Instalar Browsers do Playwright**

```bash
npx playwright install
```

Isso baixará os browsers necessários (Chromium, Firefox, WebKit).

---

## 📝 Comandos Disponíveis

### **Testes Básicos**

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Validação visual apenas (screenshots)
npm run test:visual

# Testes do Kanban especificamente
npm run test:kanban

# Validar tudo (visual + kanban)
npm run validate
```

### **Debug e Inspeção**

```bash
# Modo debug interativo
npm run test:debug

# UI interativa do Playwright
npm run test:ui

# Ver relatório HTML
npm run test:report
```

---

## 🔍 Fluxo de Trabalho Recomendado

### **Cenário 1: Fazer uma mudança e validar**

1. **Fazer a mudança no código:**
   ```bash
   # Editar arquivo, por exemplo:
   # src/components/KanbanCard.tsx
   ```

2. **Validar visualmente:**
   ```bash
   npm run test:visual
   ```

3. **Verificar screenshots:**
   - Abrir `test-results/visual/` para ver screenshots
   - Comparar com versão anterior

4. **Testar funcionalidade:**
   ```bash
   npm run test:kanban
   ```

### **Cenário 2: Debug interativo**

1. **Iniciar modo debug:**
   ```bash
   npm run test:debug
   ```

2. **Playwright abrirá:**
   - Navegador controlado
   - DevTools integrado
   - Controle passo a passo

3. **Inspecionar elementos:**
   - Usar seletores
   - Verificar estado
   - Testar interações

### **Cenário 3: Validação contínua**

1. **Usar script de monitoramento:**
   ```powershell
   .\scripts\watch-and-validate.ps1
   ```

2. **O script:**
   - Monitora mudanças em `src/`
   - Roda validação automaticamente
   - Mostra resultados em tempo real

---

## 🎨 Validação Visual

### **Screenshots Automáticos**

Os testes capturam screenshots em:
- `test-results/visual/kanban-full.png` - Kanban completo
- `test-results/visual/card-detail.png` - Detalhe do card
- `test-results/visual/filters.png` - Filtros
- `test-results/visual/dashboard.png` - Dashboard

### **Como Usar**

1. **Rodar validação visual:**
   ```bash
   npm run test:visual
   ```

2. **Verificar screenshots:**
   ```bash
   # Windows
   explorer test-results\visual

   # Ou abrir manualmente
   ```

3. **Comparar com versão anterior:**
   - Salvar screenshots de referência
   - Comparar visualmente
   - Detectar regressões

---

## 🐛 Debug de Problemas

### **Problema: Testes falhando**

1. **Ver logs detalhados:**
   ```bash
   npm run test:e2e -- --reporter=list
   ```

2. **Ver screenshots de falhas:**
   - Abrir `test-results/` após falha
   - Screenshots são salvos automaticamente

3. **Debug interativo:**
   ```bash
   npm run test:debug
   ```

### **Problema: Servidor não inicia**

1. **Verificar se porta 3000 está livre:**
   ```bash
   netstat -ano | findstr :3000
   ```

2. **Iniciar servidor manualmente:**
   ```bash
   npm run dev
   ```

3. **Rodar testes em servidor existente:**
   - Playwright detecta servidor rodando
   - Não precisa iniciar novamente

### **Problema: Elementos não encontrados**

1. **Aumentar timeout:**
   - Editar `playwright.config.ts`
   - Aumentar `timeout` e `expect.timeout`

2. **Adicionar wait explícito:**
   ```typescript
   await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
   ```

3. **Usar seletores mais flexíveis:**
   - Já implementado nos testes
   - Usa fallbacks automáticos

---

## 📊 Relatórios

### **Relatório HTML**

Após rodar testes:

```bash
npm run test:report
```

Isso abre um relatório HTML interativo com:
- ✅ Testes passando
- ❌ Testes falhando
- 📸 Screenshots
- 📹 Vídeos (se configurado)
- 🔍 Traces

### **Localização dos Relatórios**

- **HTML:** Abre automaticamente após testes
- **JSON:** `test-results/results.json`
- **Screenshots:** `test-results/visual/`
- **Vídeos:** `test-results/` (se falhar)

---

## 🎯 Integração com Cursor

### **Workflow Recomendado**

1. **Fazer mudança no código**
2. **Rodar validação rápida:**
   ```bash
   npm run validate
   ```
3. **Verificar resultados:**
   - Screenshots em `test-results/visual/`
   - Relatório HTML
4. **Ajustar se necessário**
5. **Repetir até estar correto**

### **Automação com Scripts**

```powershell
# Validar após mudanças
.\scripts\validate-changes.ps1

# Monitorar continuamente
.\scripts\watch-and-validate.ps1
```

---

## 🔧 Customização

### **Adicionar Novos Testes**

1. **Criar arquivo em `tests/e2e/`:**
   ```typescript
   // tests/e2e/meu-teste.spec.ts
   import { test, expect } from '@playwright/test';
   
   test('meu teste', async ({ page }) => {
     await page.goto('/');
     // Seu teste aqui
   });
   ```

2. **Rodar teste específico:**
   ```bash
   npx playwright test tests/e2e/meu-teste.spec.ts
   ```

### **Configurar Timeouts**

Editar `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 60 * 1000, // 60 segundos
  expect: {
    timeout: 10000, // 10 segundos
  },
});
```

---

## ✅ Checklist de Validação

Antes de considerar uma mudança completa:

- [ ] Screenshots capturados
- [ ] Testes E2E passando
- [ ] Validação visual OK
- [ ] Sem regressões detectadas
- [ ] Relatório revisado

---

## 🚨 Troubleshooting

### **Erro: "Cannot find module '@playwright/test'"**

```bash
npm install @playwright/test
npx playwright install
```

### **Erro: "Port 3000 already in use"**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou mudar porta no vite.config.ts
```

### **Testes muito lentos**

1. Reduzir `workers` em `playwright.config.ts`
2. Usar `test.only()` para testar um caso específico
3. Aumentar timeouts se necessário

---

## 📚 Recursos Adicionais

- [Documentação Playwright](https://playwright.dev)
- [Guia de Seletores](https://playwright.dev/docs/selectors)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

**Status:** ✅ Setup completo e pronto para uso!

