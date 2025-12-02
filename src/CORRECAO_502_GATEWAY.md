# Solução para Erro 502 Bad Gateway

O erro 502 Bad Gateway indica que o Coolify não está conseguindo se conectar com a sua aplicação na porta correta. Isso acontece porque mudamos o servidor para usar a porta **3000**, mas o Coolify provavelmente ainda está configurado para escutar na porta **80**.

## PASSO 1: Corrigir a Porta no Painel do Coolify (URGENTE)

1. Acesse seu projeto no Coolify.
2. Vá em **Settings (Configurações)** > **General**.
3. Procure por **"Ports Exposes"** ou **"Port"**.
4. Altere o valor de `80` para `3000`.
5. **Salve** as alterações.
6. Clique em **"Restart"** ou **"Redeploy"**.

## PASSO 2: Verificar Logs da Aplicação

Se após trocar a porta o erro persistir:

1. Vá na aba **Logs** da sua aplicação no Coolify.
2. Verifique se aparece a mensagem: `Serving!`, `Accepting connections at http://localhost:3000` ou algo similar.
3. Se houver erros (em vermelho), copie e me envie.

## PASSO 3: Forçar Rebuild sem Cache

Às vezes, o Coolify mantém um cache antigo.

1. Na aba **Deployments**.
2. Selecione **"Deploy without cache"** ou **"Force Rebuild"** se disponível.

---

**Nota técnica:** Eu já atualizei o arquivo `coolify.yaml` no código para a porta 3000, mas dependendo de como você configurou o projeto, o painel visual tem prioridade sobre o arquivo. Por isso a alteração manual no painel é necessária.
