# Guia Completo: Configurar Qdrant Local para Roo Code

## 🎯 Problema Identificado
O Docker Desktop não está rodando na sua máquina, então vou usar uma solução alternativa mais simples: **instalação direta do Qdrant**.

## ✅ Solução: Instalação Direta do Qdrant

### Passo 1: Executar o Setup Automático
```batch
# No terminal/cmd, vá até o diretório onde estão os arquivos e execute:
setup_qdrant_local.bat
```

**O que este script faz:**
- ✅ Baixa automaticamente a última versão do Qdrant para Windows
- ✅ Extrai e instala o Qdrant localmente
- ✅ Inicia o Qdrant na porta 6333
- ✅ Abre automaticamente o dashboard no navegador

### Passo 2: Verificar se está Funcionando
Após executar o script, verifique:
1. **Terminal**: Deve mostrar "Qdrant iniciado com sucesso!"
2. **Dashboard**: http://localhost:6333/dashboard deve abrir no navegador
3. **API**: http://localhost:6333 deve responder

### Passo 3: Configurar no Roo Code
No painel de Indexação de Código do Roo Code:

```
URL Qdrant: http://localhost:6333
Chave da API Qdrant: (deixe vazio - não precisa para instância local)
```

Depois clique em "Start Indexing" - deve funcionar perfeitamente!

## 🛠️ Comandos Úteis

### Parar o Qdrant
```batch
stop_qdrant_local.bat
```

### Verificar Status
```batch
tasklist | findstr qdrant
```

### Logs do Qdrant
O Qdrant roda em background, então para ver logs você precisa:
1. Abrir o terminal que iniciou o Qdrant
2. Ou reiniciar o Qdrant para ver logs no console

## 🔧 Solução de Problemas

### Qdrant não baixa/instala
1. Verifique conexão com internet
2. Execute o terminal como Administrador
3. Verifique se o Windows permite downloads

### Porta 6333 em uso
O Qdrant tentará usar a porta 6333. Se estiver ocupada:
```batch
# Verificar processo usando a porta
netstat -ano | findstr :6333

# Parar processo (substitua PID pelo número encontrado)
taskkill /PID <PID> /F
```

### Dashboard não abre
1. Verifique se o Qdrant está rodando: `tasklist | findstr qdrant`
2. Acesse manualmente: http://localhost:6333/dashboard
3. Verifique firewall do Windows

## 📋 Estrutura de Arquivos Criados
```
📁 Diretório atual/
├── 📄 setup_qdrant_local.bat     # Script de instalação
├── 📄 stop_qdrant_local.bat      # Script para parar
├── 📄 GUIA_QDRANT_ROO_CODE.md    # Este guia
└── 📁 qdrant_local/              # Diretório do Qdrant
    ├── 📄 qdrant.exe             # Executável principal
    └── 📁 storage/               # Dados persistentes
```

## 🎉 Vantagens desta Solução

- ✅ **Não depende do Docker Desktop** - funciona mesmo com problemas no Docker
- ✅ **Mais rápida** - instalação direta sem container
- ✅ **Fácil de gerenciar** - scripts simples para start/stop
- ✅ **Dados persistentes** - informações salvas localmente
- ✅ **Compatível com Roo Code** - mesma configuração que o Docker

## 📞 Próximos Passos

1. Execute `setup_qdrant_local.bat`
2. Aguarde a instalação e inicialização
3. Configure no Roo Code conforme mostrado acima
4. Teste a indexação de código

Se tiver algum erro, me mande a mensagem específica que posso ajudar a resolver! 🚀