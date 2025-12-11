# 🚀 Setup do Frontend - Guia Rápido

## ✅ Status

**Frontend integrado com sucesso!**

O repositório do Figma Maker foi clonado e todos os arquivos foram movidos para a raiz do projeto, mantendo a estrutura existente (`supabase/`, `docs/`).

---

## 📦 Estrutura Final

```
Pesca lead - Back-end/
├── src/                    # ✅ Frontend React (do Figma Maker)
│   ├── components/         # Componentes React
│   ├── hooks/              # Hooks customizados
│   ├── services/           # Serviços de API
│   └── ...
├── supabase/               # ✅ Backend Supabase (mantido)
│   ├── functions/
│   │   └── kanban-api/     # Nova API otimizada
│   └── migrations/
├── docs/                   # ✅ Documentação (mantida)
├── package.json            # ✅ Dependências do frontend
├── vite.config.ts          # ✅ Config do Vite
└── index.html              # ✅ Entry point
```

---

## 🚀 Passos para Começar

### **1. Instalar Dependências**

```bash
npm install
```

### **2. Configurar Variáveis de Ambiente**

Criar arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://nlbcwaxkeaddfocigwuk.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

**Onde encontrar a ANON KEY:**
- Supabase Dashboard → Settings → API → `anon` `public` key

### **3. Rodar em Desenvolvimento**

```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:3000`

---

## 🔗 Integração com Kanban API

O frontend já está parcialmente integrado com a nova `kanban-api`:

### **✅ Já Usando `kanban-api`:**
- `src/services/funnels-service.ts`:
  - `getLeadsByColumn()` - linha 281
  - `getAllColumnsLeads()` - linha 714

### **⚠️ Ainda Usando `make-server-e4f9d774`:**
- `src/services/funnels-service.ts`:
  - `updateFunnel()` - linha 486
- `src/services/leads-service.ts`:
  - `moveLead()` - linha 855
  - `deleteLead()` - linha 978
- `src/utils/kanban-api.ts` - arquivo inteiro ainda usa `make-server-e4f9d774`

---

## 📝 Próximos Passos

1. **Migrar serviços restantes para `kanban-api`**
2. **Atualizar `src/utils/kanban-api.ts`** para usar `kanban-api`
3. **Testar todas as funcionalidades**
4. **Remover dependência de `make-server-e4f9d774`** (se possível)

---

## 🔧 Comandos Úteis

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Deploy Edge Functions
cd supabase/functions/kanban-api
supabase functions deploy kanban-api
```

---

## ✅ Checklist

- [x] Git clone do repositório
- [x] Arquivos movidos para raiz
- [x] Estrutura `supabase/` mantida
- [x] Estrutura `docs/` mantida
- [ ] Instalar dependências
- [ ] Configurar `.env`
- [ ] Testar aplicação
- [ ] Migrar serviços restantes para `kanban-api`

---

**Status:** ✅ Frontend integrado e pronto para desenvolvimento!

