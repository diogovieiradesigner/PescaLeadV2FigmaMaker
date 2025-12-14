# Plano de Testes - AI Tools do Pesca Lead

## Objetivo
Este documento contém todos os cenários de teste para validar as ferramentas (tools) do agente de IA. Cada teste deve ser executado no **modo Preview** do AI Builder ou via **Widget de Chat**.

---

## Como Executar os Testes

### Pré-requisitos
1. Acesse o **AI Builder** no Pesca Lead
2. Selecione um agente configurado com as tools ativas
3. Use o modo **Preview** (ícone de play/chat)
4. Execute cada teste e anote o resultado

### Checklist de Configuração
- [ ] Agente tem as tools ativas (verificar em Configurações > Tools)
- [ ] Calendário configurado com horários de expediente
- [ ] Pelo menos 1 atendente configurado para transferência
- [ ] Funil de CRM configurado (para criação automática de leads)

---

## 1. TOOL: `consultar_disponibilidade`

### 1.1 Cenários de Sucesso

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| CD-01 | Consulta básica | "Quais horários você tem disponível amanhã?" | Retorna 3 horários disponíveis |
| CD-02 | Consulta com data específica | "Tem horário disponível dia 20/12?" | Retorna horários para a data |
| CD-03 | Consulta com horário preferido | "Quero um horário perto das 14h na segunda" | Retorna 3 horários próximos das 14h |
| CD-04 | Consulta para próxima semana | "Quais horários livres você tem semana que vem?" | Retorna horários de um dia da semana |
| CD-05 | Consulta manhã | "Tem horário de manhã disponível?" | Retorna horários entre 08:00-12:00 |
| CD-06 | Consulta tarde | "Prefiro horário à tarde, tem disponível?" | Retorna horários entre 13:00-18:00 |

### 1.2 Cenários de Erro/Validação

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| CD-07 | Dia sem expediente (sábado) | "Tem horário no sábado?" | Mensagem: "Não há expediente configurado para sábado" |
| CD-08 | Dia sem expediente (domingo) | "Quero agendar no domingo" | Mensagem: "Não há expediente configurado para domingo" |
| CD-09 | Data passada | "Tem horário ontem?" | IA deve sugerir datas futuras |
| CD-10 | Data muito no futuro | "Tem horário daqui 6 meses?" | Deve retornar disponibilidade ou limite |
| CD-11 | Feriado (se configurado) | "Tem horário no dia 25/12?" | Verificar comportamento para feriados |
| CD-12 | Formato data inválido | Forçar data inválida via API | Mensagem: "Formato de data inválido" |

### 1.3 Cenários de Borda

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| CD-13 | Todos horários ocupados | Preencher agenda e testar | Mensagem: "Não há horários disponíveis" |
| CD-14 | Calendário não configurado | Desativar calendário e testar | Mensagem: "Calendário não configurado" |
| CD-15 | Múltiplos períodos no dia | Configurar manhã e tarde separados | Retorna horários de ambos períodos |

---

## 2. TOOL: `agendar_reuniao`

### 2.1 Cenários de Sucesso

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| AR-01 | Agendamento básico | "Quero marcar uma reunião amanhã às 10h" | Evento criado com sucesso |
| AR-02 | Agendamento com título | "Agenda uma demonstração do produto para segunda às 14h" | Evento com título "demonstração do produto" |
| AR-03 | Agendamento com observação | "Marca reunião terça 15h, vou levar os documentos" | Evento com observação salva |
| AR-04 | Agendamento com duração | "Quero uma reunião de 30 minutos amanhã às 9h" | Evento de 30 minutos |
| AR-05 | Agendamento após consulta | Primeiro consultar, depois agendar horário sugerido | Fluxo completo funciona |
| AR-06 | Confirmação de agendamento | Após agendar, perguntar "Está confirmado?" | IA confirma detalhes do agendamento |

### 2.2 Cenários de Erro/Validação

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| AR-07 | Data passada | "Agenda reunião para ontem às 10h" | Mensagem: "Não é possível agendar para data/hora no passado" |
| AR-08 | Hora passada (hoje) | "Marca reunião hoje às 06h" (se já passou) | Mensagem: "Não é possível agendar para data/hora no passado" |
| AR-09 | Dia sem expediente | "Agenda reunião no domingo às 10h" | Mensagem: "Não há expediente configurado para domingo" |
| AR-10 | Fora do horário | "Marca às 22h de segunda" | Mensagem: "Horário fora do expediente" |
| AR-11 | Conflito de horário | Agendar 2 reuniões no mesmo horário | Mensagem: "Horário indisponível, já existe evento" |
| AR-12 | Sem título | Tentar agendar sem informar assunto | IA deve perguntar o assunto |
| AR-13 | Formato hora inválido | Forçar hora inválida via API | Mensagem: "Formato de hora inválido" |
| AR-14 | Formato data inválido | Forçar data inválida via API | Mensagem: "Formato de data inválido" |

### 2.3 Cenários de Borda

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| AR-15 | Horário limite início | "Agenda às 08:00" (primeiro horário) | Evento criado no primeiro slot |
| AR-16 | Horário limite fim | "Agenda às 17:00" (último horário) | Evento criado respeitando duração |
| AR-17 | Duração ultrapassa expediente | "Reunião de 3h às 17h" | Mensagem de erro ou ajuste |
| AR-18 | Evento já existe parcial | Evento 14h-15h, agendar 14:30 | Deve detectar conflito |
| AR-19 | Buffer entre eventos | Agendar evento logo após outro | Respeitar buffer configurado |
| AR-20 | Calendário não configurado | Desativar calendário | Mensagem: "Calendário não configurado" |

---

## 3. TOOL: `finalizar_atendimento`

### 3.1 Cenários de Sucesso

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| FA-01 | Finalização básica | "Obrigado, pode encerrar o atendimento" | Atendimento finalizado com sucesso |
| FA-02 | Finalização com despedida | "Era só isso, muito obrigado pela ajuda!" | Finaliza e despede |
| FA-03 | Finalização após resolver | Resolver dúvida, depois "Tchau, resolveu minha dúvida" | Finaliza com resumo |
| FA-04 | Confirmar finalização | "Pode fechar o chamado" | IA confirma e finaliza |

### 3.2 Cenários de Erro/Validação

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| FA-05 | Sem resumo | Forçar finalização sem contexto | IA deve gerar resumo automático |
| FA-06 | Conversa já finalizada | Tentar finalizar 2x | Comportamento adequado |
| FA-07 | Finalização acidental | "Tchau" no meio da conversa | IA deve confirmar se quer encerrar |

### 3.3 Cenários de Verificação Pós-Teste

| ID | Verificação | Como Verificar | Esperado |
|----|-------------|----------------|----------|
| FA-08 | Status da conversa | Verificar no banco/dashboard | Status = "resolved" |
| FA-09 | Sessão AI finalizada | Verificar ai_conversation_sessions | Status = "completed" |
| FA-10 | Resumo salvo | Verificar context_summary | Resumo presente |
| FA-11 | Log no pipeline | Verificar logs do agente | Step registrado |

---

## 4. TOOL: `transferir_para_humano`

### 4.1 Cenários de Sucesso

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| TH-01 | Transferência direta | "Quero falar com um atendente humano" | Conversa transferida |
| TH-02 | Transferência por insatisfação | "Não estou satisfeito, quero falar com alguém" | Transferência com prioridade alta |
| TH-03 | Transferência por complexidade | "Tenho um problema muito específico que precisa de ajuda" | Transferência com contexto |
| TH-04 | Transferência com motivo | "Preciso de suporte técnico especializado" | Motivo registrado |

### 4.2 Cenários de Erro/Validação

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| TH-05 | Sem atendentes disponíveis | Remover todos atendentes | Mensagem: "Nenhum atendente disponível" |
| TH-06 | Transferência já realizada | Tentar transferir 2x | Comportamento adequado |

### 4.3 Cenários de Verificação Pós-Teste

| ID | Verificação | Como Verificar | Esperado |
|----|-------------|----------------|----------|
| TH-07 | Status da conversa | Verificar no banco | Status = "waiting" |
| TH-08 | Atendente atribuído | Verificar assigned_to | ID do atendente |
| TH-09 | Tipo de atendente | Verificar attendant_type | "human" |
| TH-10 | Sessão AI transferida | Verificar ai_conversation_sessions | Status = "transferred" |
| TH-11 | Notificação criada | Verificar tabela notifications | Notificação para atendente |
| TH-12 | Contexto preservado | Verificar context_summary | Resumo da conversa |

---

## 5. TOOL: `atualizar_crm`

### 5.1 Cenários de Sucesso

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| AC-01 | Atualizar empresa | "Minha empresa é ABC Tecnologia" | Campo company atualizado |
| AC-02 | Atualizar nome | "Meu nome é João Silva" | Campo client_name atualizado |
| AC-03 | Adicionar observação | "Anota aí: prefiro contato por WhatsApp" | Campo notes atualizado |
| AC-04 | Múltiplas informações | "Sou Maria, da empresa XYZ" | Ambos campos atualizados |
| AC-05 | Campo personalizado | "Meu cargo é Gerente de TI" | Campo personalizado atualizado |

### 5.2 Cenários de Erro/Validação

| ID | Cenário | Mensagem de Teste | Resultado Esperado |
|----|---------|-------------------|-------------------|
| AC-06 | Campo inexistente | Forçar campo que não existe | Mensagem: "Campo não encontrado" |
| AC-07 | Sem lead vinculado | Testar sem lead criado | Mensagem: "Lead não encontrado" |
| AC-08 | Valor vazio | Tentar atualizar com valor vazio | Tratamento adequado |

### 5.3 Cenários de Verificação Pós-Teste

| ID | Verificação | Como Verificar | Esperado |
|----|-------------|----------------|----------|
| AC-09 | Dado salvo | Verificar tabela leads | Campo atualizado |
| AC-10 | Atividade registrada | Verificar lead_activities | Registro de alteração |
| AC-11 | Campo personalizado | Verificar lead_custom_values | Valor salvo |

---

## 6. TOOL: `enviar_documento` (PENDENTE)

> **ATENÇÃO**: Esta tool ainda não está totalmente implementada. Ela apenas registra a solicitação mas NÃO envia documentos reais.

### 6.1 Comportamento Atual

| ID | Cenário | Mensagem de Teste | Resultado Atual |
|----|---------|-------------------|-----------------|
| ED-01 | Solicitar catálogo | "Pode me enviar o catálogo?" | Registra solicitação, NÃO envia |
| ED-02 | Solicitar proposta | "Quero receber uma proposta" | Registra solicitação, NÃO envia |
| ED-03 | Solicitar contrato | "Me manda o contrato" | Registra solicitação, NÃO envia |

---

## 7. TESTES DE INTEGRAÇÃO

### 7.1 Fluxo Completo de Agendamento

| Passo | Ação | Esperado |
|-------|------|----------|
| 1 | "Olá, quero agendar uma reunião" | IA pergunta preferência de data/hora |
| 2 | "Pode ser amanhã" | IA consulta disponibilidade |
| 3 | IA oferece 3 horários | Cliente escolhe um |
| 4 | "Quero às 10h" | IA agenda a reunião |
| 5 | IA confirma agendamento | Detalhes corretos |
| 6 | "Obrigado, era só isso" | IA finaliza atendimento |

### 7.2 Fluxo de Captura de Dados + Agendamento

| Passo | Ação | Esperado |
|-------|------|----------|
| 1 | "Olá, sou João da Empresa X" | IA atualiza CRM |
| 2 | "Quero uma demonstração do produto" | IA entende intenção |
| 3 | IA oferece horários | Cliente escolhe |
| 4 | Agendamento confirmado | Evento vinculado ao lead |
| 5 | Verificar lead no CRM | Dados e evento associados |

### 7.3 Fluxo de Escalonamento

| Passo | Ação | Esperado |
|-------|------|----------|
| 1 | Fazer perguntas complexas | IA tenta responder |
| 2 | "Isso não resolve, quero falar com alguém" | IA oferece transferência |
| 3 | Confirmar transferência | Conversa transferida |
| 4 | Verificar notificação | Atendente notificado |

---

## 8. TESTES DE STRESS/VOLUME

### 8.1 Múltiplas Requisições

| ID | Cenário | Teste | Esperado |
|----|---------|-------|----------|
| ST-01 | Várias mensagens rápidas | Enviar 5 mensagens seguidas | Todas processadas |
| ST-02 | Agendamentos simultâneos | 2 usuários agendando mesmo horário | Apenas 1 sucesso |
| ST-03 | Consultas repetidas | Consultar disponibilidade 10x | Respostas consistentes |

---

## 9. CHECKLIST DE VALIDAÇÃO FINAL

### Antes de Aprovar para Produção

- [ ] Todos os testes CD (Consultar Disponibilidade) passaram
- [ ] Todos os testes AR (Agendar Reunião) passaram
- [ ] Todos os testes FA (Finalizar Atendimento) passaram
- [ ] Todos os testes TH (Transferir para Humano) passaram
- [ ] Todos os testes AC (Atualizar CRM) passaram
- [ ] Fluxos de integração testados
- [ ] Logs aparecem no pipeline corretamente
- [ ] Dados salvos no banco corretamente
- [ ] Mensagens de erro são claras e úteis
- [ ] Nenhum erro 500 ou crash durante os testes

---

## 10. TEMPLATE DE REGISTRO DE TESTE

```
## Teste: [ID do Teste]
**Data:** ____/____/________
**Testador:** ________________
**Ambiente:** [ ] Preview [ ] Widget [ ] Produção

### Entrada
Mensagem enviada: "_______________________"

### Resultado
- [ ] Passou
- [ ] Falhou

**Resposta da IA:**
_________________________________

**Verificação no Banco:**
_________________________________

**Observações:**
_________________________________
```

---

## Contato para Dúvidas

Em caso de dúvidas sobre os testes ou comportamentos inesperados, documente:
1. ID do teste
2. Mensagem enviada
3. Resposta recebida
4. Screenshot (se possível)
5. Horário do teste

---

*Documento gerado em: 14/12/2024*
*Versão: 1.0*
