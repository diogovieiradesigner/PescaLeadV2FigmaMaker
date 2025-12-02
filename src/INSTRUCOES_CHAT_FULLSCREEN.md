# Instruções: Fazer Chat em Tela Cheia no LeadFullViewModal

## Problema
O chat dentro do modal de lead está dividindo espaço com abas e sidebar. Precisa ocupar 100% da tela quando ativo (igual WhatsApp Web).

## Arquivo a Modificar
`/components/LeadFullViewModal.tsx`

## Modificações Necessárias

### 1. **Linha 648** - Remover borda direita quando chat ativo

**ANTES:**
```tsx
<div className="flex-1 flex flex-col min-w-0 border-r border-border-light dark:border-white/[0.08]">
```

**DEPOIS:**
```tsx
<div className={`flex-1 flex flex-col min-w-0 ${activeTab === 'chat' ? '' : 'border-r border-border-light dark:border-white/[0.08]'}`}>
```

---

### 2. **Linhas 649-686** - Esconder barra de abas quando chat ativo

**ANTES:**
```tsx
               {/* Tabs Header */}
               <div className={`flex items-center px-6 border-b ${
                  isDark ? 'border-white/[0.08] bg-true-black' : 'border-border-light bg-white'
               }`}>
                  <button onClick={() => setActiveTab('chat')} ...>
                     ...
                  </button>
                  <button onClick={() => setActiveTab('data')} ...>
                     ...
                  </button>
                  <button onClick={() => setActiveTab('activities')} ...>
                     ...
                  </button>
               </div>
```

**DEPOIS:**
```tsx
               {/* Tabs Header - Esconder quando em modo chat */}
               {activeTab !== 'chat' && (
               <div className={`flex items-center px-6 border-b ${
                  isDark ? 'border-white/[0.08] bg-true-black' : 'border-border-light bg-white'
               }`}>
                  <button onClick={() => setActiveTab('chat')} ...>
                     ...
                  </button>
                  <button onClick={() => setActiveTab('data')} ...>
                     ...
                  </button>
                  <button onClick={() => setActiveTab('activities')} ...>
                     ...
                  </button>
               </div>
               )}
```

**Explicação:** Adicionar `{activeTab !== 'chat' && (` antes da div e `)}` depois para esconder as abas quando chat estiver ativo.

---

### 3. **Linha 1192** - Esconder sidebar direito quando chat ativo

**ANTES:**
```tsx
            {/* Right Column - Sidebar */}
            <div className={`w-80 flex-shrink-0 border-l overflow-y-auto ${
               isDark ? 'border-white/[0.08] bg-elevated' : 'border-border-light bg-white'
            }`}>
               ... (todo o conteúdo do sidebar)
            </div>
```

**DEPOIS:**
```tsx
            {/* Right Column - Sidebar - Esconder quando em modo chat */}
            {activeTab !== 'chat' && (
            <div className={`w-80 flex-shrink-0 border-l overflow-y-auto scrollbar-thin ${
               isDark ? 'border-white/[0.08] bg-elevated' : 'border-border-light bg-white'
            }`}>
               ... (todo o conteúdo do sidebar)
            </div>
            )}
```

**Explicação:** Adicionar `{activeTab !== 'chat' && (` antes da div do sidebar e `)}` depois do fechamento da div (por volta da linha 1310).

**BÔNUS:** Também adicionar a classe `scrollbar-thin` no sidebar para padronizar o scroll.

---

## Resultado Esperado

Quando o usuário clicar na aba "Chat":
- ✅ Barra de abas desaparece
- ✅ Sidebar direito desaparece  
- ✅ Chat ocupa 100% da largura disponível
- ✅ Visual idêntico ao WhatsApp Web (tela cheia de chat)

Quando clicar em "Campos Personalizados" ou "Atividades":
- ✅ Barra de abas volta a aparecer
- ✅ Sidebar direito volta a aparecer
- ✅ Layout normal de 3 colunas

---

## Como Testar

1. Abrir um lead no CRM
2. Ir para aba "Chat"
3. Verificar que o chat está em tela cheia (sem abas em cima, sem sidebar à direita)
4. Mudar para aba "Campos Personalizados"
5. Verificar que as abas e sidebar voltam
