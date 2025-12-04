# 🔄 SOLUÇÕES ALTERNATIVAS - Sistema de Convites

## 🎯 PROBLEMA ATUAL
Independente do tipo de router (hash ou browser), o sistema de convites não está funcionando de forma confiável.

---

## ✅ SOLUÇÃO 1: QUERY PARAMETERS (MAIS SIMPLES - RECOMENDADO)

### Como funciona:
URL: `https://hub.pescalead.com.br/?invite=726b96b2e60f43e6bedc5c1f8cdb16ac`
      ou: `https://hub.pescalead.com.br/#/?invite=726b96b2e60f43e6bedc5c1f8cdb16ac`

### Vantagens:
✅ **100% confiável** - Query params sempre funcionam
✅ **Sem dependência de router** - Funciona com qualquer configuração
✅ **Fácil de testar** - Basta adicionar ?invite=CODE
✅ **Compatível com tudo** - WhatsApp, email, redes sociais
✅ **Implementação simples** - 1 hora de trabalho

### Desvantagens:
⚠️ URL um pouco mais "feia" (mas funciona!)

### Implementação:

#### 1. Detectar query param no App.tsx (ou AuthWrapper)
```typescript
useEffect(() => {
  // Ler query parameter da URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  
  if (inviteCode) {
    console.log('🎯 Convite detectado:', inviteCode);
    
    if (!user) {
      // Usuário não logado: salvar e pedir login
      localStorage.setItem('pendingInvite', inviteCode);
      console.log('💾 Convite salvo, redirecionando para login...');
    } else {
      // Usuário logado: aceitar imediatamente
      handleAcceptInvite(inviteCode);
    }
    
    // Limpar URL (opcional, para ficar mais limpo)
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [user]);
```

#### 2. Processar pendingInvite após login
```typescript
// No AuthContext ou App.tsx, após login bem-sucedido
useEffect(() => {
  if (user) {
    const pending = localStorage.getItem('pendingInvite');
    if (pending) {
      console.log('🎯 Processando convite pendente:', pending);
      localStorage.removeItem('pendingInvite');
      handleAcceptInvite(pending);
    }
  }
}, [user]);
```

#### 3. Função de aceitar convite
```typescript
const handleAcceptInvite = async (code: string) => {
  try {
    setIsProcessingInvite(true);
    toast.info('Processando convite...');
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/invites/${code}/accept`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.workspace_id) {
      toast.success('Convite aceito com sucesso!');
      await refreshWorkspaces();
      switchWorkspace(data.workspace_id);
    } else {
      toast.error(data.error || 'Erro ao aceitar convite');
    }
  } catch (error) {
    toast.error('Erro ao processar convite');
    console.error('Erro ao aceitar convite:', error);
  } finally {
    setIsProcessingInvite(false);
  }
};
```

#### 4. Gerar links de convite
```typescript
// Em WorkspaceMembersModal.tsx ou onde gera o link
const inviteLink = `${window.location.origin}/?invite=${inviteCode}`;
// Resultado: https://hub.pescalead.com.br/?invite=726b96b2...
```

---

## ✅ SOLUÇÃO 2: MODAL DE CONVITE (BOA UX)

### Como funciona:
- URL continua sendo `/?invite=CODE`
- Sistema detecta o param
- Abre um **modal bonito** mostrando detalhes do convite
- Usuário clica "Aceitar" no modal

### Vantagens:
✅ **Experiência visual melhor**
✅ **Usuário vê detalhes antes de aceitar**
✅ **Não precisa criar páginas novas**
✅ **Funciona com qualquer router**

### Implementação:

#### 1. Criar componente InviteModal
```typescript
interface InviteModalProps {
  isOpen: boolean;
  inviteCode: string;
  onClose: () => void;
  onAccept: () => void;
}

export function InviteModal({ isOpen, inviteCode, onClose, onAccept }: InviteModalProps) {
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen && inviteCode) {
      loadInviteDetails(inviteCode);
    }
  }, [isOpen, inviteCode]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convite para Workspace</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div>Carregando detalhes...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Workspace</p>
              <p className="font-semibold">{invite?.workspace.name}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Função</p>
              <p className="font-semibold">{invite?.role}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Convidado por</p>
              <p className="font-semibold">{invite?.inviter.name}</p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Recusar
          </Button>
          <Button onClick={onAccept} disabled={loading}>
            Aceitar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 2. Usar no App.tsx
```typescript
const [inviteModalOpen, setInviteModalOpen] = useState(false);
const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  
  if (inviteCode && user) {
    setPendingInviteCode(inviteCode);
    setInviteModalOpen(true);
    // Limpar URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [user]);

// No render
<InviteModal 
  isOpen={inviteModalOpen}
  inviteCode={pendingInviteCode}
  onClose={() => setInviteModalOpen(false)}
  onAccept={() => handleAcceptInvite(pendingInviteCode)}
/>
```

---

## ✅ SOLUÇÃO 3: PÁGINA STANDALONE + REDIRECT (MAIS ROBUSTA)

### Como funciona:
1. Criar arquivo HTML estático: `/public/invite.html`
2. Link: `https://hub.pescalead.com.br/invite.html?code=726b96b2...`
3. Página detecta se está logado via API
4. Se logado → aceita e redireciona
5. Se não logado → redireciona para `/?invite=CODE`

### Vantagens:
✅ **Totalmente independente do React**
✅ **Funciona mesmo se app quebrar**
✅ **Super confiável**
✅ **Pode ter design próprio**

### Implementação:

#### Criar `/public/invite.html`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Convite - Pesca Lead</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Processando convite...</h2>
    <p id="message">Aguarde enquanto validamos seu convite</p>
  </div>
  
  <script>
    (async function() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (!code) {
        document.getElementById('message').textContent = 'Código inválido';
        return;
      }
      
      // Verificar se usuário está logado
      const session = localStorage.getItem('supabase.auth.token');
      
      if (!session) {
        // Não logado: redirecionar para app com query param
        document.getElementById('message').textContent = 'Redirecionando para login...';
        setTimeout(() => {
          window.location.href = `/?invite=${code}`;
        }, 1000);
        return;
      }
      
      // Logado: tentar aceitar convite
      try {
        const token = JSON.parse(session).access_token;
        const projectId = 'SEU_PROJECT_ID';
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/invites/${code}/accept`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        const data = await response.json();
        
        if (response.ok) {
          document.getElementById('message').textContent = 'Convite aceito! Redirecionando...';
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          document.getElementById('message').textContent = data.error || 'Erro ao aceitar convite';
        }
      } catch (error) {
        document.getElementById('message').textContent = 'Erro ao processar convite';
        console.error(error);
      }
    })();
  </script>
</body>
</html>
```

#### Link gerado:
```
https://hub.pescalead.com.br/invite.html?code=726b96b2e60f43e6bedc5c1f8cdb16ac
```

---

## ✅ SOLUÇÃO 4: CÓDIGO CURTO + TELA DE INPUT (SUPER SIMPLES)

### Como funciona:
- Não usa link longo
- Gera código curto de 6 dígitos: `ABC123`
- Usuário entra no app e digita o código
- Sistema valida e aceita

### Vantagens:
✅ **Mais fácil de compartilhar** (WhatsApp, telefone)
✅ **Sem problemas de URL**
✅ **Funciona sempre**

### Implementação:

#### 1. Gerar código curto
```typescript
// Ao criar convite
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 0, 1 (confusão)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Salvar no banco
const shortCode = generateShortCode();
// Armazenar junto com o UUID do convite
```

#### 2. Tela de input no app
```typescript
export function InviteCodeInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (code.length !== 6) {
      toast.error('Código deve ter 6 caracteres');
      return;
    }
    
    setLoading(true);
    try {
      // Buscar convite pelo código curto
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/invites/by-code/${code}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Convite aceito!');
        refreshWorkspaces();
      } else {
        toast.error(data.error || 'Código inválido');
      }
    } catch (error) {
      toast.error('Erro ao validar código');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3>Tem um código de convite?</h3>
      <Input 
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="text-center text-2xl tracking-widest"
      />
      <Button onClick={handleSubmit} disabled={loading}>
        Validar Código
      </Button>
    </div>
  );
}
```

#### Como compartilhar:
```
Olá! Você foi convidado para o workspace Pesca Lead.
Digite o código: ABC123
```

---

## 📊 COMPARAÇÃO DAS SOLUÇÕES

| Solução | Confiabilidade | Complexidade | UX | Tempo |
|---------|----------------|--------------|-----|-------|
| **1. Query Params** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 1h |
| **2. Modal** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 2h |
| **3. HTML Standalone** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 3h |
| **4. Código Curto** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | 2h |

---

## 🎯 RECOMENDAÇÃO FINAL

### **IMPLEMENTAR SOLUÇÃO 1 (Query Params) AGORA**
- Mais rápida de implementar
- 100% confiável
- Funciona em qualquer cenário

### **Depois, adicionar SOLUÇÃO 2 (Modal)**
- Melhora a UX
- Não quebra nada
- Complementa a solução 1

### **Futuro: SOLUÇÃO 4 (Código Curto)**
- Facilita compartilhamento
- Alternativa para links que não funcionam
- Backup sempre disponível

---

## 🚀 PRÓXIMO PASSO

**Qual solução você quer que eu implemente AGORA?**

1. Query Params (1 hora, 100% garantido)
2. Modal + Query Params (2 horas, melhor UX)
3. HTML Standalone (3 horas, super robusto)
4. Código Curto (2 horas, mais simples para usuário)

Escolha uma e eu implemento IMEDIATAMENTE com testes funcionando!
