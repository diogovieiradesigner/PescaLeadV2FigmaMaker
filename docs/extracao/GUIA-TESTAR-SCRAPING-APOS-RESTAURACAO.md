# Guia: Testar Website Scraping Após Restauração do Serviço

## ✅ Status Atual

**Serviço de scraping restaurado:** https://scraper.pescalead.com.br/docs

**Extração `3c7a7725-b38b-40a4-8dba-569f22002946`:**
- ✅ **7 perfis resetados** para `queued` (prontos para processamento)
- ✅ **Log criado** indicando reinício do processo
- ✅ **Edge function ativada** para processar os perfis

## 🔄 Como Testar Novamente

### 1. Verificar o Progresso
**Acesse a interface de progresso:**
```
http://localhost:3000/extracao/progresso/3c7a7725-b38b-40a4-8dba-569f22002946
```

**O que você deve ver:**
- ✅ Aba "Scraping" com novos logs
- ✅ Status dos perfis mudando de `queued` para `processing` → `completed`
- ✅ Progresso em tempo real

### 2. Monitorar os Logs
**Na aba "Scraping" você verá logs como:**
```
[15:22] Website Scraping Started
[15:23] Processing Profile: ondinaengenharia
[15:24] Profile Scraped Successfully: contato@ondina.com.br
[15:25] Processing Profile: jhsservicos
...
```

### 3. Tempo de Processamento
- **Cada perfil**: ~30-60 segundos
- **Total estimado**: 7-10 minutos
- **Logs em tempo real**: A cada 10-30 segundos

## 🎯 Perfis que Serão Processados

**Lista dos 7 perfis resetados:**
1. `aparquiteturaresidencial` → aparqueturaresidencial.com.br/bio
2. `construtoralirajr` → www.lirajuniorengenharia.com.br/
3. `jhsservicos` → www.jhsservicos.com.br/
4. `madeireiramadalena` → madeireiramadalena.com.br
5. `ondinaengenharia` → contate.me/ondinaengenharia
6. `saomateusincorporadora` → www.incorporadorasaomateus.com.br/
7. `ultrarevestimentos` → www.ultrarevestimentos.com.br/

## 🚀 Como Fazer uma Nova Extração

### Passo a Passo:

1. **Acesse o Dashboard:**
   ```
   http://localhost:3000/extraction
   ```

2. **Clique em "Nova Extração"**

3. **Configure os parâmetros:**
   - **Fonte**: Instagram
   - **Termo de busca**: "casa de construção" (ou outro)
   - **Localização**: "Recife, Pernambuco, Brazil"
   - **Quantidade**: 20-30 perfis
   - **Nicho**: Construção/Arquitetura

4. **Execute a extração:**
   - Clique em "Iniciar Extração"
   - Acompanhe o progresso em tempo real

### Parâmetros Recomendados para Teste:

```json
{
  "source": "instagram",
  "search_term": "arquitetura",
  "location": "São Paulo, São Paulo, Brazil",
  "target_quantity": 15,
  "niche": "Arquitetura"
}
```

## 🔧 Solução de Problemas

### Se o Scraping Ainda Falhar:

1. **Verificar status do serviço:**
   - Acesse: https://scraper.pescalead.com.br/docs
   - Confirme se está online e respondendo

2. **Logs de erro detalhados:**
   - Verifique na aba "Scraping" os erros específicos
   - Copie a mensagem de erro para análise

3. **Reset manual (se necessário):**
   ```sql
   -- Apenas para desenvolvedores
   UPDATE instagram_enriched_profiles 
   SET website_scraping_status = 'queued'
   WHERE run_id = 'SUA_EXTRAÇÃO_ID'::UUID
     AND website_scraping_status = 'failed';
   ```

### Se a Interface Não Atualizar:

1. **Refresh da página:**
   - F5 ou Ctrl+R
   - Ou clique no botão de atualizar

2. **Verificar conexão:**
   - Certifique-se que o frontend está rodando
   - Teste: http://localhost:3000

## 📊 Resultados Esperados

### ✅ Sucesso:
- **Aba "Scraping" populada** com logs detalhados
- **Status `completed`** para perfis processados com sucesso
- **Dados enriquecidos**: emails, telefones, endereços
- **Leads completos** prontos para uso

### ❌ Falhas Parciais:
- Alguns perfis com `failed` (sites bloqueados/inacessíveis)
- Logs indicando reason da falha
- **Recomendação**: Tentar novamente em algumas horas

### ⚠️ Falhas Totais:
- **Se todos falharem**: Problema com o serviço de scraping
- **Ação**: Aguardar restabelecimento ou contactar suporte

## 🎯 Próximos Passos

1. **Monitore a extração atual** (7 perfis)
2. **Se tudo funcionar bem**: Execute uma nova extração
3. **Documente os resultados** para otimizações futuras
4. **Considere aumentar** o número de perfis (30-50)

## 📞 Suporte

**Se precisar de ajuda:**
- Verifique os logs na interface
- Confirme o status do serviço em https://scraper.pescalead.com.br/docs
- Teste com uma extração menor (10-15 perfis) primeiro

---

**Resumo:** O sistema está pronto para teste! Os 7 perfis que falharam foram resetados e estão na fila para processamento. Acompanhe o progresso na interface e execute uma nova extração para validar que tudo está funcionando corretamente.