# ==========================================
# STAGE 1: Build da Aplicação
# ==========================================
FROM node:20-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências (incluindo devDependencies para o build)
RUN npm ci --legacy-peer-deps

# Copiar todo o código fonte
COPY . .

# Build da aplicação com Vite
RUN npm run build

# ==========================================
# STAGE 2: Servidor de Produção com Nginx
# ==========================================
FROM nginx:alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

# Remover configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build da aplicação do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Iniciar nginx em foreground
CMD ["nginx", "-g", "daemon off;"]
