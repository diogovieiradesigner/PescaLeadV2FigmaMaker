# ✅ Guia de Testes - Sistema de Convites (CORRIGIDO)

## 🎯 Correções Aplicadas

### 1. ✅ Alterado Router de Browser para Hash
**Arquivo:** `/utils/routes.tsx`
```typescript
// ANTES (❌ não funcionava)
import { createBrowserRouter } from 'react-router';

// DEPOIS (✅ funciona com #)
import { createHashRouter } from 'react-router';
```

### 2. ✅ Removido interceptação de hash do AuthWrapper
**Arquivo:** `/components/auth/AuthWrapper.tsx`
- Removida lógica que detectava `#/invite/...`
- Agora o React Router processa naturalmente

### 3. ✅ Adicionado processamento de pendingInvite
**Arquivo:** `/components/InviteAcceptPage.tsx`
- Detecta quando usuário faz login após clicar em convite
- Redireciona automaticamente para o convite

---

## 🧪 TESTES OBRIGATÓRIOS

### ✅ Teste 1: Convite com usuário NÃO logado

**Passos:**
1. Abrir em aba anônima: `https://hub.pescalead.com.br/#/invite/726b96b2e60f43e6bedc5c1f8cdb16ac`
2. **Resultado Esperado:** Mostra tela de "Processando convite..."
3. **Resultado Esperado:** Salva código no localStorage e redireciona para login
4. Fazer login com um usuário válido
5. **Resultado Esperado:** Após login, detecta pendingInvite e redireciona para `/invite/...`
6. **Resultado Esperado:** Aceita o convite automaticamente
7. **Resultado Esperado:** Mostra "Convite aceito!"
8. **Resultado Esperado:** Redireciona para o workspace após 2 segundos

**Como testar:**
```javascript
// Abrir console do navegador ANTES de fazer login
localStorage.getItem('pendingInvite')
// Deve retornar: "726b96b2e60f43e6bedc5c1f8cdb16ac"

// DEPOIS de fazer login
localStorage.getItem('pendingInvite')
// Deve retornar: null (foi removido)
```

---

### ✅ Teste 2: Convite com usuário JÁ logado

**Passos:**
1. Fazer login ANTES de abrir o link
2. Abrir: `https://hub.pescalead.com.br/#/invite/726b96b2e60f43e6bedc5c1f8cdb16ac`
3. **Resultado Esperado:** Mostra "Processando convite..."
4. **Resultado Esperado:** Aceita o convite imediatamente (sem pedir login)
5. **Resultado Esperado:** Mostra "Convite aceito!"
6. **Resultado Esperado:** Redireciona para o workspace

**Verificação:**
```javascript
// Console do navegador
window.location.hash
// Deve mostrar: "#/invite/726b96b2e60f43e6bedc5c1f8cdb16ac"
```

---

### ✅ Teste 3: Convite INVÁLIDO

**Passos:**
1. Abrir: `https://hub.pescalead.com.br/#/invite/codigo-invalido-123`
2. **Resultado Esperado:** Mostra erro "Não foi possível aceitar o convite"
3. **Resultado Esperado:** Botão "Voltar ao início" funciona

---

### ✅ Teste 4: Convite SEM código

**Passos:**
1. Abrir: `https://hub.pescalead.com.br/#/invite/`
2. **Resultado Esperado:** Mostra erro "Código de convite inválido"

---

### ✅ Teste 5: Navegação após aceitar convite

**Passos:**
1. Aceitar um convite válido
2. Aguardar redirecionamento
3. **Resultado Esperado:** Está na URL `https://hub.pescalead.com.br/#/`
4. **Resultado Esperado:** Workspace correto está selecionado
5. Clicar em outras seções do menu (Dashboard, Pipeline, etc)
6. **Resultado Esperado:** Navegação funciona normalmente

---

### ✅ Teste 6: Convite duplicado (mesmo usuário)

**Passos:**
1. Aceitar um convite para workspace X
2. Abrir novamente o MESMO link de convite
3. **Resultado Esperado:** Mostra erro ou já mostra que é membro

---

### ✅ Teste 7: Hash persiste ao recarregar

**Passos:**
1. Abrir: `https://hub.pescalead.com.br/#/invite/726b96b2e60f43e6bedc5c1f8cdb16ac`
2. Apertar F5 (recarregar página)
3. **Resultado Esperado:** URL continua com `#/invite/...`
4. **Resultado Esperado:** Página processa o convite novamente

---

## 🔍 DEBUGGING

### Se o convite NÃO funcionar:

#### 1. Verificar Console do Navegador (F12)
```
Procurar por erros em vermelho
Verificar se há mensagens de "[AUTH WRAPPER]" ou "[InviteAcceptPage]"
```

#### 2. Verificar Network Tab
```
1. Abrir DevTools → Network
2. Filtrar por "invite"
3. Ver se está fazendo request para: /functions/v1/make-server-e4f9d774/invites/...
4. Verificar resposta (200 = sucesso, 404 = não encontrado, 401 = não autorizado)
```

#### 3. Verificar localStorage
```javascript
// Console do navegador
localStorage.getItem('pendingInvite')
// Se retornar código mas não redireciona = problema no useEffect

// Limpar manualmente se necessário
localStorage.removeItem('pendingInvite')
```

#### 4. Verificar se Router está usando Hash
```javascript
// Console do navegador
window.location.hash
// Deve retornar: "#/invite/..."

// Se retornar vazio = Router não está usando hash
```

#### 5. Logs de Debug Úteis

**Adicionar temporariamente em `/components/InviteAcceptPage.tsx`:**
```typescript
useEffect(() => {
  console.log('🔍 InviteAcceptPage:', {
    code,
    hasUser: !!user,
    pendingInvite: localStorage.getItem('pendingInvite'),
    hash: window.location.hash
  });
}, [code, user]);
```

---

## 📋 CHECKLIST PÓS-CORREÇÃO

- [ ] Teste 1: Convite com usuário não logado ✅
- [ ] Teste 2: Convite com usuário logado ✅
- [ ] Teste 3: Convite inválido ✅
- [ ] Teste 4: Convite sem código ✅
- [ ] Teste 5: Navegação após aceitar ✅
- [ ] Teste 6: Convite duplicado ✅
- [ ] Teste 7: Hash persiste ao recarregar ✅
- [ ] Console sem erros ✅
- [ ] Network requests funcionando ✅
- [ ] localStorage sendo limpo corretamente ✅

---

## 🚨 PROBLEMAS CONHECIDOS (Se ocorrerem)

### Problema: "Processando convite..." não sai do loading

**Causa provável:** Hook `useWorkspaceMembers` com erro

**Solução:**
```typescript
// Verificar se acceptInvite está retornando algo
console.log('acceptInvite result:', result);
```

### Problema: Redireciona mas não troca workspace

**Causa provável:** `switchWorkspace()` não está funcionando

**Solução:**
```typescript
// Verificar workspaces após aceitar
console.log('Workspaces:', workspaces);
console.log('Result workspace_id:', result.workspace_id);
```

### Problema: Login funciona mas não volta para convite

**Causa provável:** `pendingInvite` não está sendo processado

**Solução:**
```typescript
// Adicionar log no useEffect
useEffect(() => {
  console.log('🔍 Checking pendingInvite:', {
    hasUser: !!user,
    hasCode: !!code,
    pending: localStorage.getItem('pendingInvite')
  });
}, [user, code]);
```

---

## ✅ SUCESSO ESPERADO

Ao abrir `https://hub.pescalead.com.br/#/invite/726b96b2e60f43e6bedc5c1f8cdb16ac`:

```
1. ✅ URL mantém o #/invite/...
2. ✅ Mostra tela de processamento
3. ✅ Se não logado → salva no localStorage → vai para login
4. ✅ Após login → detecta pendingInvite → redireciona para /invite/...
5. ✅ Aceita convite automaticamente
6. ✅ Mostra "Convite aceito!"
7. ✅ Redireciona para workspace
8. ✅ Workspace correto está selecionado
9. ✅ Navegação funciona normalmente
```

---

## 📊 MÉTRICAS DE SUCESSO

- **Taxa de sucesso de convites:** 100% (para convites válidos)
- **Tempo de processamento:** < 2 segundos
- **Erros no console:** 0
- **Compatibilidade:** Todos os navegadores modernos

---

## 🔗 URLs DE TESTE

### URL de Convite Real:
```
https://hub.pescalead.com.br/#/invite/726b96b2e60f43e6bedc5c1f8cdb16ac
```

### URL de Convite Inválido (para testar erro):
```
https://hub.pescalead.com.br/#/invite/codigo-invalido-teste
```

### URL da Home:
```
https://hub.pescalead.com.br/#/
```

---

## 📝 NOTAS IMPORTANTES

1. **SEMPRE use aba anônima** para testar "usuário não logado"
2. **Limpe localStorage** entre testes se necessário
3. **Verifique Network tab** para ver requests
4. **Console.log é seu amigo** - adicione logs temporários se precisar debugar
5. **Hash routing é case-sensitive** - mantenha lowercase

---

## 🎯 PRÓXIMOS PASSOS APÓS VALIDAÇÃO

Se tudo funcionar:
- [ ] Remover logs de debug temporários
- [ ] Testar em produção com convites reais
- [ ] Monitorar erros no Sentry/Analytics
- [ ] Documentar fluxo de convite para equipe
- [ ] (Opcional) Adicionar testes automatizados
