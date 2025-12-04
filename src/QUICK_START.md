# ⚡ Quick Start - Pesca Lead CRM

## 🚀 Para Começar Agora

### 1️⃣ Abrir no Figma Make
- Abra o projeto no Figma Make
- O projeto vai carregar automaticamente

### 2️⃣ Instalar Dependências (se necessário)

Se o CSS não aparecer ou houver erros:

```bash
npm install
npm run dev
```

### 3️⃣ Recarregar Preview
- Pressione **Cmd/Ctrl + Shift + R** (hard reload)
- A interface de login deve aparecer completamente estilizada

---

## ✅ O que Deve Aparecer

### Tela de Login:
- ✅ Logo "Pesca Lead" centralizado
- ✅ Formulário de login com campos estilizados
- ✅ Botão "Entrar" com gradiente azul
- ✅ Background preto (dark theme)
- ✅ Bordas e sombras corretas

---

## 🔧 Se Algo Não Funcionar

### CSS não aparece?
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Erro de PostCSS?
- Confirme que `tailwind.config.js` existe na raiz
- Confirme que `postcss.config.js` existe na raiz
- Confirme que `package.json` tem `tailwindcss: ^3.4.0`

### Console com erros?
- Abra DevTools (F12)
- Veja a aba Console para mensagens de erro
- Veja a aba Network para verificar se arquivos estão carregando

---

## 📚 Documentação

- **Detalhes do CSS Fix:** [CSS_FIX_COMPLETO.md](/CSS_FIX_COMPLETO.md)
- **Setup Figma Make:** [FIGMA_MAKE_SETUP.md](/FIGMA_MAKE_SETUP.md)
- **README Completo:** [README.md](/README.md)

---

## 🎯 Próximos Passos

Após o login funcionar:

1. ✅ Explorar o Dashboard (5 abas de analytics)
2. ✅ Testar o Kanban de leads
3. ✅ Configurar agentes de IA
4. ✅ Integrar WhatsApp
5. ✅ Adicionar leads ao funil

---

## 🐛 Problemas Comuns

| Problema | Solução |
|----------|---------|
| CSS quebrado | `npm install` + reload |
| Login não funciona | Verificar variáveis Supabase |
| Erro 404 em APIs | Verificar Edge Functions |
| Kanban não carrega | Verificar RLS policies |

---

## 📞 Suporte

- 📖 Leia a documentação em `/docs/`
- 💬 Supabase Discord: https://discord.supabase.com
- 🐛 Issues: Veja logs no console do navegador

---

**Pronto para usar! 🚀**
