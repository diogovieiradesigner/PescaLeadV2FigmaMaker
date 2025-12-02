# Correção Crítica: Erro "npm: command not found"

O erro ocorre porque o sistema de build (Nixpacks) está **confundindo** seu projeto com um projeto **Deno** (devido à pasta `supabase/functions`) e, por isso, não está instalando o Node.js nem o NPM.

Precisamos forçar a instalação do Node.js manualmente.

## Solução Definitiva (Via Variáveis de Ambiente)

No painel do Coolify:

1. Vá para o seu projeto > **Configuration**.
2. Procure a seção **Environment Variables** (Variáveis de Ambiente).
3. Adicione uma nova variável com os seguintes dados exatos:

   - **Key (Nome):** `NIXPACKS_PKGS`
   - **Value (Valor):** `nodejs_20 npm-9_x`

   *(Se houver uma opção "Build Variable" ou caixa de seleção "Is Build Variable?", marque-a. Se não, adicione como variável normal).*

4. **Salve** as alterações.

## Passo Adicional (Garantia)

Vá na aba **Build** e certifique-se de que os comandos estão definidos como combinamos anteriormente:

- **Install Command:** `npm ci --legacy-peer-deps`
- **Build Command:** `npm run build`
- **Start Command:** `npx serve dist -s -l 3000`

## Redeploy

Após adicionar a variável `NIXPACKS_PKGS`, clique em **Redeploy** (ou "Deploy without cache").

Isso forçará o Nixpacks a baixar o Node.js v20 e o NPM, permitindo que o comando `npm ci` funcione corretamente.
