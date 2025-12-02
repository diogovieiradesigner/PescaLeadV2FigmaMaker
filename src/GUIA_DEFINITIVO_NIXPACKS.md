# Guia Definitivo: Migração para Nixpacks (Porta 3000)

Este guia detalha os passos para configurar o Coolify para usar **Nixpacks** e eliminar definitivamente os erros causados pela pasta `/Dockerfile/` criada pela automação.

## 1. Estado Atual
- **Limpeza Realizada**: Os arquivos conflitantes dentro da pasta `/Dockerfile/` foram removidos.
- **Configuração Atualizada**: O arquivo `coolify.yaml` foi ajustado para usar o método de build `nixpacks`.
- **Arquivo de Build**: O arquivo `nixpacks.toml` já está configurado corretamente na raiz do projeto.

## 2. Passos no Painel do Coolify

Para garantir que o deploy funcione, siga estes passos exatos no seu painel do Coolify:

1. **Acesse o Recurso**: Vá para o seu projeto e selecione o recurso da aplicação (Pesca Lead).
2. **Configurações de Build (Build Pack)**:
   - Vá na aba **Configuration** > **Build Pack**.
   - Altere a opção de "Dockerfile" para **"Nixpacks"**.
   - **Salvie** a alteração.

3. **Verifique as Portas**:
   - Na aba **Configuration** > **General** (ou equivalente dependendo da versão).
   - Certifique-se de que a **Port** (Porta Interna) está definida como `3000`.
   - O `nixpacks.toml` está configurado para servir na porta 3000 (`npx serve dist -s -l 3000`).

4. **Limpeza de Cache (Opcional mas Recomendado)**:
   - Se houver opção de "Force Rebuild" ou "Deploy without Cache", use-a para o primeiro deploy após essa mudança.

## 3. Por que isso resolve?
- O **Nixpacks** ignora a existência de Dockerfiles (ou pastas com esse nome) quando explicitamente selecionado ou quando um `nixpacks.toml` está presente e tem prioridade.
- Ao remover a dependência do arquivo `Dockerfile`, a recriação automática da pasta `/Dockerfile/` pelo "Figma Make" deixa de ser um problema crítico de deploy, pois o sistema de build não estará mais procurando por aquele arquivo específico.

## 4. Conteúdo do `nixpacks.toml` (Referência)
O arquivo já está criado na raiz com o seguinte conteúdo:
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm-9_x"]

[phases.install]
cmds = ["npm ci --legacy-peer-deps"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve dist -s -l 3000"
```

## 5. Próximo Deploy
Pode iniciar o deploy imediatamente. Se o erro persistir, verifique os logs do "Build Server" no Coolify para confirmar se ele está lendo a configuração do Nixpacks.
