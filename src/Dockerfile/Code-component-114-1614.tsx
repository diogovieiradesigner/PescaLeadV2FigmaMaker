# Usar imagem oficial do Node.js 20
FROM node:20-slim

# Instalar serve globalmente
RUN npm install -g serve

# Diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar resto do código
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta 3000
EXPOSE 3000

# Comando de start
CMD ["npx", "serve", "dist", "-s", "-l", "3000"]
