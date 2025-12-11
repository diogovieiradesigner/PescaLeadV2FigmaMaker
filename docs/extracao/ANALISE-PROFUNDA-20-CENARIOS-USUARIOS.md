# 🔍 Análise Profunda: 20 Cenários de Uso Real por Usuários

## 📋 Objetivo

Analisar 20 cenários diferentes de uso real por usuários leigos, intermediários e avançados para validar o sistema de expansão V16.

---

## 👥 PERFIL DE USUÁRIOS

### **Usuário Leigo (Não Técnico)**
- Não conhece formato correto de localização
- Pode digitar de forma informal
- Pode usar acentos e caracteres especiais
- Pode não especificar estado

### **Usuário Intermediário**
- Conhece formato básico
- Sabe que precisa de cidade e estado
- Pode usar formatos variados

### **Usuário Avançado**
- Conhece formato correto
- Usa siglas de estado
- Especifica localização completa

---

## 🎯 CENÁRIO 1: Usuário Leigo - Busca Simples

**Perfil:** Usuário leigo, primeira vez usando o sistema

**Input:**
- Termo: `"pizzarias"`
- Localização: `"s"` (incompleto!)
- Meta: 50 leads

**Fluxo Esperado:**
1. Sistema detecta localização incompleta
2. Normaliza: `"São, State of Sao, Brazil"` (⚠️ PROBLEMA!)
3. Busca Overpass: Não encontra bairros (cidade inválida)
4. Expansão: Não tenta expandir

**Status:** ⚠️ **PROBLEMA IDENTIFICADO**

**Problema:** Sistema não valida se localização é válida antes de processar.

**Impacto:** Pode gerar resultados incorretos ou erro silencioso.

---

## 🎯 CENÁRIO 2: Usuário Leigo - Com Acentos

**Perfil:** Usuário leigo, digita com acentos

**Input:**
- Termo: `"restaurantes"`
- Localização: `"João Pessoa, Paraíba"`
- Meta: 100 leads

**Fluxo Esperado:**
1. Normaliza: `"Joao Pessoa, State of Paraiba, Brazil"` ✅
2. Detecta nível: `city` ✅
3. Busca inicial: 80 leads encontrados
4. API esgota: Sim
5. Expansão: Busca bairros de João Pessoa
6. Resultado: 120 leads totais

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 3: Usuário Leigo - Sem Estado

**Perfil:** Usuário leigo, não especifica estado

**Input:**
- Termo: `"padarias"`
- Localização: `"Rio de Janeiro"` (sem estado!)
- Meta: 200 leads

**Fluxo Esperado:**
1. Normaliza: `"Rio De Janeiro, State of Rio De Janeiro, Brazil"` (⚠️ ASSUME estado!)
2. Detecta nível: `city` (assume cidade)
3. Busca inicial: 150 leads encontrados
4. API esgota: Sim
5. Expansão: Busca bairros de "Rio de Janeiro"
6. Resultado: 250 leads totais

**Status:** ⚠️ **PROBLEMA POTENCIAL**

**Problema:** Sistema assume que "Rio de Janeiro" é cidade, mas pode ser estado também.

**Impacto:** Pode buscar bairros da cidade quando usuário quis dizer estado.

---

## 🎯 CENÁRIO 4: Usuário Intermediário - Formato Correto

**Perfil:** Usuário intermediário, conhece formato básico

**Input:**
- Termo: `"farmácias"`
- Localização: `"Belo Horizonte, MG"`
- Meta: 150 leads

**Fluxo Esperado:**
1. Normaliza: `"Belo Horizonte, State of Minas Gerais, Brazil"` ✅
2. Detecta nível: `city` ✅
3. Busca inicial: 120 leads encontrados
4. API esgota: Sim
5. Expansão: Busca bairros de Belo Horizonte
6. Cálculo: Falta 30 leads → 1 página em 3 bairros
7. Resultado: 150 leads totais

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 5: Usuário Intermediário - Bairro Específico

**Perfil:** Usuário intermediário, quer bairro específico

**Input:**
- Termo: `"supermercados"`
- Localização: `"Centro, João Pessoa, PB"`
- Meta: 50 leads

**Fluxo Esperado:**
1. Normaliza: `"Centro, State of Paraiba, Brazil"` ✅
2. Detecta nível: `neighborhood` ✅
3. Busca inicial: 45 leads encontrados
4. API esgota: Sim
5. Expansão: **NÃO EXPANDE** (já está em bairro) ✅
6. Resultado: 45 leads (não atinge meta, mas respeita granularidade)

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 6: Usuário Avançado - Estado Completo

**Perfil:** Usuário avançado, quer estado inteiro

**Input:**
- Termo: `"hotéis"`
- Localização: `"São Paulo"` (quer estado!)
- Meta: 500 leads

**Fluxo Esperado:**
1. Normaliza: `"São Paulo, State of Sao Paulo, Brazil"` (⚠️ ASSUME cidade!)
2. Detecta nível: `state` (detecta como estado) ✅
3. Busca inicial: 200 leads encontrados
4. API esgota: Sim
5. Expansão: Busca bairros de várias cidades de SP
6. Resultado: 600 leads totais

**Status:** ⚠️ **AMBÍGUO**

**Problema:** "São Paulo" pode ser cidade ou estado. Sistema detecta como estado, mas normaliza como cidade.

**Impacto:** Pode funcionar, mas não é claro qual intenção do usuário.

---

## 🎯 CENÁRIO 7: Usuário Leigo - Muitos Leads

**Perfil:** Usuário leigo, pede muitos leads

**Input:**
- Termo: `"restaurantes"`
- Localização: `"São Paulo, SP"`
- Meta: 1000 leads

**Fluxo Esperado:**
1. Normaliza: `"São Paulo, State of Sao Paulo, Brazil"` ✅
2. Detecta nível: `city` ✅
3. Busca inicial: 200 leads encontrados
4. API esgota: Sim
5. Expansão: Busca bairros
6. Cálculo: Falta 800 leads → 80 páginas necessárias
7. Limite: `MAX_PAGES_PER_SEGMENT = 3`, `MAX_SEGMENTED_SEARCHES = 20`
8. Resultado: 20 bairros × 3 páginas = 60 páginas = ~600 leads
9. Total: 200 + 600 = 800 leads (não atinge 1000!)

**Status:** ⚠️ **PROBLEMA IDENTIFICADO**

**Problema:** Limite de páginas por bairro impede atingir meta alta.

**Impacto:** Usuário não consegue quantidade desejada.

---

## 🎯 CENÁRIO 8: Usuário Intermediário - Meta Já Atingida

**Perfil:** Usuário intermediário, meta atingida antes da expansão

**Input:**
- Termo: `"padarias"`
- Localização: `"Curitiba, PR"`
- Meta: 100 leads

**Fluxo Esperado:**
1. Busca inicial: 120 leads encontrados
2. Meta atingida: 120/100 = 120% ✅
3. Expansão: **NÃO TENTA** (meta já atingida) ✅
4. Resultado: 120 leads

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 9: Usuário Leigo - Localização com "Brasil"

**Perfil:** Usuário leigo, inclui "Brasil" na localização

**Input:**
- Termo: `"farmácias"`
- Localização: `"Porto Alegre, RS, Brasil"`
- Meta: 80 leads

**Fluxo Esperado:**
1. Normaliza: `"Porto Alegre, State of Rio Grande Do Sul, Brazil"` ✅
2. Detecta nível: `neighborhood` (⚠️ ERRADO! Tem 3 partes)
3. Expansão: **NÃO EXPANDE** (detecta como bairro)

**Status:** ⚠️ **PROBLEMA IDENTIFICADO**

**Problema:** Sistema detecta como `neighborhood` porque tem 3 partes, mas "Brasil" não é bairro!

**Impacto:** Não expande quando deveria expandir.

---

## 🎯 CENÁRIO 10: Usuário Avançado - Bairro com País

**Perfil:** Usuário avançado, especifica bairro completo

**Input:**
- Termo: `"supermercados"`
- Localização: `"Bancários, João Pessoa, PB, Brasil"`
- Meta: 30 leads

**Fluxo Esperado:**
1. Normaliza: `"Bancários, State of Paraiba, Brazil"` ✅
2. Detecta nível: `neighborhood` ✅
3. Busca inicial: 25 leads encontrados
4. Expansão: **NÃO EXPANDE** ✅
5. Resultado: 25 leads

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 11: Usuário Leigo - Cidade Pequena

**Perfil:** Usuário leigo, cidade pequena sem muitos bairros

**Input:**
- Termo: `"restaurantes"`
- Localização: `"Campina Grande, PB"`
- Meta: 200 leads

**Fluxo Esperado:**
1. Busca inicial: 50 leads encontrados
2. API esgota: Sim
3. Expansão: Busca bairros
4. Overpass: Retorna 5 bairros apenas
5. Cálculo: Falta 150 leads → 15 páginas necessárias
6. Limite: 5 bairros × 3 páginas = 15 páginas = ~150 leads
7. Resultado: 50 + 150 = 200 leads ✅

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 12: Usuário Intermediário - Cidade Grande

**Perfil:** Usuário intermediário, cidade grande com muitos bairros

**Input:**
- Termo: `"padarias"`
- Localização: `"São Paulo, SP"`
- Meta: 300 leads

**Fluxo Esperado:**
1. Busca inicial: 200 leads encontrados
2. API esgota: Sim
3. Expansão: Busca bairros
4. Overpass: Retorna 96 bairros
5. Cálculo: Falta 100 leads → 10 páginas necessárias
6. Otimização: 10 bairros × 1 página = 10 páginas ✅
7. Resultado: 200 + 100 = 300 leads ✅

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 13: Usuário Leigo - Erro de Digitação

**Perfil:** Usuário leigo, erra ao digitar

**Input:**
- Termo: `"farmácias"`
- Localização: `"Sao Paulo"` (sem acento, sem estado)
- Meta: 150 leads

**Fluxo Esperado:**
1. Normaliza: `"Sao Paulo, State of Sao Paulo, Brazil"` (⚠️ ASSUME estado!)
2. Detecta nível: `city` (assume cidade)
3. Busca inicial: 120 leads encontrados
4. Expansão: Busca bairros de "Sao Paulo"
5. Resultado: 180 leads

**Status:** ⚠️ **FUNCIONA MAS AMBÍGUO**

**Problema:** Não sabe se usuário quis cidade ou estado.

---

## 🎯 CENÁRIO 14: Usuário Avançado - Estado com expand_state_search

**Perfil:** Usuário avançado, usa filtro expand_state_search

**Input:**
- Termo: `"hotéis"`
- Localização: `"São Paulo, SP"`
- Filtro: `expand_state_search: true`
- Meta: 500 leads

**Fluxo Esperado:**
1. Normaliza: `"State of Sao Paulo, Brazil"` ✅
2. Detecta nível: `city` (ainda detecta como cidade)
3. Busca inicial: 300 leads encontrados
4. Expansão: Busca bairros de várias cidades de SP
5. Resultado: 600 leads

**Status:** ⚠️ **PROBLEMA POTENCIAL**

**Problema:** `expand_state_search` muda normalização mas não muda detecção de nível.

**Impacto:** Pode não expandir corretamente para várias cidades.

---

## 🎯 CENÁRIO 15: Usuário Leigo - Meta Muito Baixa

**Perfil:** Usuário leigo, pede poucos leads

**Input:**
- Termo: `"padarias"`
- Localização: `"Recife, PE"`
- Meta: 10 leads

**Fluxo Esperado:**
1. Busca inicial: 15 leads encontrados
2. Meta atingida: 15/10 = 150% ✅
3. Expansão: **NÃO TENTA** ✅
4. Resultado: 15 leads

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 16: Usuário Intermediário - Meta Exata

**Perfil:** Usuário intermediário, meta exata

**Input:**
- Termo: `"restaurantes"`
- Localização: `"Fortaleza, CE"`
- Meta: 100 leads

**Fluxo Esperado:**
1. Busca inicial: 95 leads encontrados
2. API esgota: Sim
3. Expansão: Busca bairros
4. Cálculo: Falta 5 leads → 1 página necessária
5. Otimização: 1 bairro × 1 página = 1 página ✅
6. Resultado: 95 + 5 = 100 leads ✅

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 17: Usuário Leigo - Localização com Vírgulas Extras

**Perfil:** Usuário leigo, usa muitas vírgulas

**Input:**
- Termo: `"farmácias"`
- Localização: `"São Paulo, SP, Brasil, América do Sul"` (4 partes!)
- Meta: 200 leads

**Fluxo Esperado:**
1. Normaliza: `"São Paulo, State of Sao Paulo, Brazil"` ✅
2. Detecta nível: `neighborhood` (⚠️ ERRADO! Tem 4 partes)
3. Expansão: **NÃO EXPANDE** (detecta como bairro)

**Status:** ⚠️ **PROBLEMA IDENTIFICADO**

**Problema:** Qualquer coisa com 3+ partes é detectado como bairro, mesmo que seja apenas informação extra.

**Impacto:** Não expande quando deveria expandir.

---

## 🎯 CENÁRIO 18: Usuário Avançado - Cidade com Nome de Estado

**Perfil:** Usuário avançado, cidade com nome igual ao estado

**Input:**
- Termo: `"padarias"`
- Localização: `"Rio de Janeiro, RJ"` (cidade, não estado)
- Meta: 250 leads

**Fluxo Esperado:**
1. Normaliza: `"Rio De Janeiro, State of Rio De Janeiro, Brazil"` ✅
2. Detecta nível: `city` ✅
3. Busca inicial: 200 leads encontrados
4. Expansão: Busca bairros de Rio de Janeiro (cidade)
5. Resultado: 280 leads ✅

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 🎯 CENÁRIO 19: Usuário Leigo - Localização Vazia

**Perfil:** Usuário leigo, esquece de preencher localização

**Input:**
- Termo: `"restaurantes"`
- Localização: `""` (vazio!)
- Meta: 100 leads

**Fluxo Esperado:**
1. Validação: Deve retornar erro ✅
2. Sistema: Não processa

**Status:** ⚠️ **VERIFICAR VALIDAÇÃO**

**Problema:** Precisa verificar se sistema valida input vazio.

---

## 🎯 CENÁRIO 20: Usuário Intermediário - Múltiplas Expansões

**Perfil:** Usuário intermediário, sistema tenta expandir múltiplas vezes

**Input:**
- Termo: `"supermercados"`
- Localização: `"Brasília, DF"`
- Meta: 500 leads

**Fluxo Esperado:**
1. Busca inicial: 150 leads encontrados
2. API esgota: Sim
3. Expansão: Busca bairros
4. Buscas segmentadas: 200 leads encontrados
5. Total: 350 leads (ainda abaixo de 90%)
6. Segunda expansão: **NÃO TENTA** (já expandiu) ✅
7. Resultado: 350 leads

**Status:** ✅ **FUNCIONA CORRETAMENTE**

---

## 📊 RESUMO POR CENÁRIO

| Cenário | Perfil | Status | Problema |
|---------|--------|--------|----------|
| 1. Localização incompleta | Leigo | ⚠️ | Não valida entrada |
| 2. Com acentos | Leigo | ✅ | Funciona |
| 3. Sem estado | Leigo | ⚠️ | Ambíguo |
| 4. Formato correto | Intermediário | ✅ | Funciona |
| 5. Bairro específico | Intermediário | ✅ | Funciona |
| 6. Estado completo | Avançado | ⚠️ | Ambíguo |
| 7. Muitos leads | Leigo | ⚠️ | Limite insuficiente |
| 8. Meta atingida | Intermediário | ✅ | Funciona |
| 9. Com "Brasil" | Leigo | ⚠️ | Detecta errado |
| 10. Bairro completo | Avançado | ✅ | Funciona |
| 11. Cidade pequena | Leigo | ✅ | Funciona |
| 12. Cidade grande | Intermediário | ✅ | Funciona |
| 13. Erro digitação | Leigo | ⚠️ | Ambíguo |
| 14. expand_state_search | Avançado | ⚠️ | Detecção inconsistente |
| 15. Meta baixa | Leigo | ✅ | Funciona |
| 16. Meta exata | Intermediário | ✅ | Funciona |
| 17. Vírgulas extras | Leigo | ⚠️ | Detecta errado |
| 18. Cidade = Estado | Avançado | ✅ | Funciona |
| 19. Localização vazia | Leigo | ⚠️ | Verificar validação |
| 20. Múltiplas expansões | Intermediário | ✅ | Funciona |

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### **1. Detecção de Nível com "Brasil"**
**Cenários:** 9, 17

**Problema:** Qualquer localização com 3+ partes é detectada como `neighborhood`, mesmo que seja apenas informação extra (ex: "Brasil", "América do Sul").

**Impacto:** Sistema não expande quando deveria expandir.

**Solução Necessária:** Melhorar lógica de detecção para ignorar partes conhecidas como país/continente.

---

### **2. Limite Insuficiente para Muitos Leads**
**Cenário:** 7

**Problema:** `MAX_PAGES_PER_SEGMENT = 3` limita capacidade de atingir metas altas.

**Impacto:** Usuário não consegue quantidade desejada.

**Solução Necessária:** Aumentar limite dinamicamente quando há poucos bairros disponíveis.

---

### **3. Ambiguidade Cidade/Estado**
**Cenários:** 3, 6, 13

**Problema:** "São Paulo", "Rio de Janeiro" podem ser cidade ou estado.

**Impacto:** Sistema pode expandir incorretamente.

**Solução Necessária:** Heurística mais inteligente ou confirmação do usuário.

---

### **4. Validação de Entrada**
**Cenários:** 1, 19

**Problema:** Sistema não valida se localização é válida antes de processar.

**Impacto:** Pode gerar resultados incorretos ou erro silencioso.

**Solução Necessária:** Adicionar validação de entrada.

---

### **5. expand_state_search Inconsistente**
**Cenário:** 14

**Problema:** `expand_state_search` muda normalização mas não muda detecção de nível.

**Impacto:** Pode não expandir corretamente para várias cidades.

**Solução Necessária:** Ajustar detecção quando `expand_state_search = true`.

---

## 📊 ESTATÍSTICAS

- **Cenários que funcionam:** 12/20 (60%)
- **Cenários com problemas:** 8/20 (40%)
- **Problemas críticos:** 5
- **Problemas moderados:** 3

---

## ✅ RECOMENDAÇÕES PRIORITÁRIAS

### **Prioridade ALTA:**
1. ✅ Melhorar detecção de nível para ignorar "Brasil" e países
2. ✅ Adicionar validação de entrada
3. ✅ Aumentar limite dinâmico de páginas por bairro

### **Prioridade MÉDIA:**
4. ⚠️ Melhorar heurística de ambiguidade cidade/estado
5. ⚠️ Ajustar detecção quando `expand_state_search = true`

### **Prioridade BAIXA:**
6. ⚠️ Adicionar confirmação do usuário para casos ambíguos

---

## 🎯 CONCLUSÃO

**Status:** ⚠️ **SISTEMA FUNCIONAL COM MELHORIAS NECESSÁRIAS**

**Funciona bem para:** Usuários que seguem formato esperado (60% dos casos)
**Problemas em:** Usuários leigos e casos com informações extras (40% dos casos)

**Recomendação:** Aplicar correções de prioridade ALTA antes do deploy em produção.

