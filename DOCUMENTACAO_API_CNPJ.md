# Documentacao da API CNPJ - Pesca Lead

## Visao Geral

API REST para consulta de dados de empresas brasileiras (CNPJ) com suporte a:
- **Consulta Individual**: Busca dados completos de um CNPJ especifico
- **Prospeccao em Massa**: Busca empresas por filtros (UF, CNAE, porte, etc.)

**Base URL**: `https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api`

---

## Autenticacao

| Endpoint | Metodo | Autenticacao |
|----------|--------|--------------|
| `/health` | GET | Nenhuma |
| `/filters` | GET | Nenhuma |
| `/?cnpj=XXX` | GET | Nenhuma |
| `/basico?cnpj=XXX` | GET | Nenhuma |
| `/socios?cnpj=XXX` | GET | Nenhuma |
| `/simples?cnpj=XXX` | GET | Nenhuma |
| `/search` | POST | **JWT obrigatorio** |
| `/stats` | GET | **JWT obrigatorio** |

### Como obter o JWT

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Login do usuario
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@email.com',
  password: 'senha123'
});

// Token JWT para usar na API
const token = data.session.access_token;
```

---

## Endpoints Publicos

### 1. Health Check

Verifica se a API esta funcionando e conectada ao banco.

```bash
GET /health
```

**Resposta**:
```json
{
  "status": "healthy",
  "provider": "banco_local",
  "database": "connected",
  "timestamp": "2025-12-17T23:45:00.000Z",
  "endpoints": {
    "consulta": ["GET /?cnpj=", "GET /basico?cnpj=", "GET /socios?cnpj=", "GET /simples?cnpj="],
    "prospeccao": ["POST /search (JWT)", "GET /filters", "GET /stats (JWT)"],
    "health": ["GET /health"]
  },
  "response_time_ms": 1337
}
```

---

### 2. Consulta CNPJ Completa

Retorna todos os dados de uma empresa.

```bash
GET /?cnpj=00000000000191
```

**Parametros**:
| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| cnpj | string | Sim | CNPJ com 14 digitos (com ou sem formatacao) |

**Exemplo**:
```bash
curl "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api?cnpj=00000000000191"
```

**Resposta**:
```json
{
  "success": true,
  "provider": "banco_local",
  "data": {
    "cnpj": "00000000000191",
    "cnpj_basico": "00000000",
    "cnpj_ordem": "0001",
    "cnpj_dv": "91",
    "razao_social": "BANCO DO BRASIL SA",
    "nome_fantasia": "DIRECAO GERAL",
    "porte": "DEMAIS",
    "porte_codigo": "05",
    "natureza_juridica": "Sociedade de Economia Mista",
    "natureza_juridica_codigo": "2038",
    "situacao_cadastral": "ATIVA",
    "situacao_cadastral_codigo": "02",
    "data_situacao_cadastral": "2005-11-03",
    "data_inicio_atividade": "1966-08-01",
    "tipo": "MATRIZ",
    "capital_social": 120000000000,
    "endereco": {
      "tipo_logradouro": "SAUN",
      "logradouro": "QUADRA 5 LOTE B TORRES I II E III",
      "numero": "SN",
      "complemento": "ANDAR 1 A 16 EDIFBANCO DO BRASIL",
      "bairro": "ASA NORTE",
      "municipio": "BRASILIA",
      "municipio_codigo": "9701",
      "uf": "DF",
      "cep": "70040912"
    },
    "contato": {
      "email": null,
      "telefone_1": "6134939002",
      "telefone_1_formatted": "(61) 3493-9002",
      "telefone_2": null,
      "telefone_2_formatted": null,
      "fax": null
    },
    "atividade": {
      "cnae_principal": "6422100",
      "cnae_descricao": "Bancos multiplos, com carteira comercial"
    },
    "simples": {
      "opcao_simples": false,
      "data_opcao_simples": null,
      "data_exclusao_simples": null,
      "opcao_mei": false,
      "data_opcao_mei": null,
      "data_exclusao_mei": null
    },
    "socios": [
      {
        "nome": "TARCIANA PAULA GOMES MEDEIROS",
        "cpf_cnpj": "***053854**",
        "qualificacao": "Presidente",
        "qualificacao_codigo": "16",
        "data_entrada": "2023-01-17",
        "faixa_etaria": "41 a 50 anos",
        "pais": null,
        "representante_legal": null,
        "nome_representante": null
      }
    ]
  },
  "cached": false,
  "response_time_ms": 1542
}
```

---

### 3. Consulta CNPJ Basica (Rapida)

Retorna apenas dados essenciais (sem socios).

```bash
GET /basico?cnpj=00000000000191
```

---

### 4. Consulta Socios

Retorna apenas o quadro societario.

```bash
GET /socios?cnpj=00000000000191
```

---

### 5. Consulta Simples/MEI

Retorna dados do Simples Nacional e MEI.

```bash
GET /simples?cnpj=00000000000191
```

---

### 6. Listar Filtros Disponiveis

Retorna todos os filtros disponiveis para o endpoint `/search`.

```bash
GET /filters
```

**Resposta**:
```json
{
  "success": true,
  "filters": {
    "termo": {
      "type": "text"
    },
    "uf": {
      "type": "select_multiple",
      "options": [
        {"value": "AC", "label": "Acre"},
        {"value": "AL", "label": "Alagoas"},
        {"value": "SP", "label": "Sao Paulo"}
      ]
    },
    "situacao": {
      "type": "select_multiple",
      "options": [
        {"value": "02", "label": "Ativa"},
        {"value": "03", "label": "Suspensa"},
        {"value": "04", "label": "Inapta"},
        {"value": "08", "label": "Baixada"}
      ]
    },
    "porte": {
      "type": "select_multiple",
      "options": [
        {"value": "00", "label": "Nao Informado"},
        {"value": "01", "label": "Microempresa"},
        {"value": "03", "label": "Empresa de Pequeno Porte"},
        {"value": "05", "label": "Demais"}
      ]
    },
    "tipo": {
      "type": "select_multiple",
      "options": [
        {"value": "1", "label": "Matriz"},
        {"value": "2", "label": "Filial"}
      ]
    },
    "simples": {
      "type": "boolean"
    },
    "mei": {
      "type": "boolean"
    },
    "com_email": {
      "type": "boolean"
    },
    "com_telefone": {
      "type": "boolean"
    },
    "capital_social": {
      "type": "range",
      "min": 0,
      "max": 999999999999,
      "presets": [
        {"label": "Ate R$ 10.000", "min": null, "max": 10000},
        {"label": "R$ 10.000 - R$ 100.000", "min": 10000, "max": 100000},
        {"label": "R$ 100.000 - R$ 1.000.000", "min": 100000, "max": 1000000},
        {"label": "Acima de R$ 1.000.000", "min": 1000000, "max": null}
      ]
    }
  }
}
```

---

## Endpoints Autenticados

### 7. Busca com Filtros (Prospeccao)

**Requer JWT no header Authorization.**

```bash
POST /search
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Body**:
```json
{
  "filters": {
    "uf": ["SP", "RJ"],
    "situacao": ["02"],
    "cnae": ["6201501"],
    "porte": ["01", "03"],
    "com_email": true,
    "simples": true
  },
  "order_by": "data_abertura",
  "order_dir": "desc",
  "limit": 100,
  "offset": 0
}
```

#### Filtros Disponiveis

| Filtro | Tipo | Descricao | Exemplo |
|--------|------|-----------|---------|
| `termo` | string | Busca em nome_fantasia ou razao_social | `"TECH"` |
| `uf` | string[] | Estados (siglas) | `["SP", "RJ"]` |
| `municipio` | string[] | Codigos IBGE dos municipios | `["3550308"]` |
| `ddd` | string[] | DDDs de telefone | `["11", "21"]` |
| `cep_prefixo` | string | Prefixo do CEP | `"01"` |
| `cnae` | string[] | Codigos CNAE completos | `["6201501"]` |
| `cnae_divisao` | string[] | Divisao CNAE (2 digitos) | `["62"]` |
| `porte` | string[] | Porte da empresa | `["01", "03"]` |
| `capital_social_min` | number | Capital social minimo | `10000` |
| `capital_social_max` | number | Capital social maximo | `1000000` |
| `situacao` | string[] | Situacao cadastral | `["02"]` |
| `tipo` | string[] | Matriz (1) ou Filial (2) | `["1"]` |
| `natureza_juridica` | string[] | Codigos de natureza juridica | `["2062"]` |
| `simples` | boolean | Optante do Simples | `true` |
| `mei` | boolean | Microempreendedor Individual | `true` |
| `com_email` | boolean | Possui email cadastrado | `true` |
| `com_telefone` | boolean | Possui telefone cadastrado | `true` |
| `data_abertura_min` | string | Data minima de abertura | `"2020-01-01"` |
| `data_abertura_max` | string | Data maxima de abertura | `"2024-12-31"` |
| `idade_min_dias` | number | Empresa com mais de X dias | `365` |
| `idade_max_dias` | number | Empresa com menos de X dias | `30` |

#### Ordenacao

| Campo | Descricao |
|-------|-----------|
| `razao_social` | Razao social (A-Z) |
| `nome_fantasia` | Nome fantasia (A-Z) |
| `capital_social` | Capital social |
| `data_abertura` | Data de abertura (padrao) |
| `uf` | Estado |
| `municipio` | Municipio |
| `cnae` | CNAE principal |

#### Paginacao

| Parametro | Tipo | Padrao | Maximo |
|-----------|------|--------|--------|
| `limit` | number | 100 | 10000 |
| `offset` | number | 0 | - |

**Resposta**:
```json
{
  "success": true,
  "total": 15847,
  "returned": 100,
  "page": 1,
  "total_pages": 159,
  "filters_applied": {
    "uf": ["SP"],
    "situacao": ["02"],
    "cnae": ["6201501"]
  },
  "data": [
    {
      "cnpj": "12345678000199",
      "razao_social": "EMPRESA EXEMPLO LTDA",
      "nome_fantasia": "EXEMPLO TECH",
      "email": "contato@exemplo.com.br",
      "telefone": "11999999999",
      "uf": "SP",
      "municipio": "Sao Paulo",
      "cnae": "6201501",
      "cnae_descricao": "Desenvolvimento de programas de computador sob encomenda",
      "porte": "03",
      "capital_social": 100000,
      "situacao": "02",
      "data_abertura": "2020-05-15",
      "tipo": "1",
      "simples": true,
      "mei": false
    }
  ],
  "response_time_ms": 403
}
```

---

### 8. Estatisticas/Preview

Retorna contagem de resultados sem retornar os dados.

**Requer JWT no header Authorization.**

```bash
GET /stats?uf=SP&situacao=02&cnae=6201501
Authorization: Bearer <JWT_TOKEN>
```

**Resposta**:
```json
{
  "success": true,
  "preview": {
    "total_matches": 15847,
    "com_email": 8234,
    "com_telefone": 14521,
    "com_email_e_telefone": 7892
  },
  "response_time_ms": 245
}
```

---

## Exemplos de Uso

### JavaScript/TypeScript (Frontend)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nlbcwaxkeaddfocigwuk.supabase.co',
  'sua_anon_key'
);

// 1. Consulta CNPJ individual (nao precisa de auth)
async function consultarCNPJ(cnpj: string) {
  const response = await fetch(
    `https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api?cnpj=${cnpj}`
  );
  return response.json();
}

// 2. Busca com filtros (precisa de auth)
async function buscarEmpresas(filters: object) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuario nao autenticado');
  }

  const response = await fetch(
    'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        filters,
        limit: 100,
        offset: 0,
        order_by: 'data_abertura',
        order_dir: 'desc'
      })
    }
  );

  return response.json();
}

// Exemplo de uso
const empresasSP = await buscarEmpresas({
  uf: ['SP'],
  situacao: ['02'],           // Ativas
  cnae_divisao: ['62'],       // TI
  com_email: true,
  porte: ['01', '03'],        // Micro e Pequeno Porte
  idade_max_dias: 365         // Abertas no ultimo ano
});
```

### cURL

```bash
# Health check
curl "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api/health"

# Consulta CNPJ
curl "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api?cnpj=00000000000191"

# Busca com filtros (substitua SEU_JWT_TOKEN)
curl -X POST "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "filters": {
      "uf": ["SP"],
      "situacao": ["02"],
      "com_email": true
    },
    "limit": 10
  }'
```

### Python

```python
import requests

BASE_URL = "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api"

# Consulta CNPJ (publico)
def consultar_cnpj(cnpj: str):
    response = requests.get(f"{BASE_URL}?cnpj={cnpj}")
    return response.json()

# Busca com filtros (autenticado)
def buscar_empresas(token: str, filters: dict, limit: int = 100):
    response = requests.post(
        f"{BASE_URL}/search",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        json={
            "filters": filters,
            "limit": limit,
            "order_by": "data_abertura",
            "order_dir": "desc"
        }
    )
    return response.json()

# Exemplo
resultado = consultar_cnpj("00000000000191")
print(resultado["data"]["razao_social"])  # BANCO DO BRASIL SA
```

---

## Codigos de Erro

| Codigo HTTP | Erro | Descricao |
|-------------|------|-----------|
| 400 | `VALIDATION_ERROR` | Parametros invalidos |
| 401 | `AUTH_ERROR` | Token JWT ausente ou invalido |
| 404 | `NOT_FOUND` | CNPJ nao encontrado |
| 405 | `Method not allowed` | Metodo HTTP incorreto |
| 500 | `INTERNAL_ERROR` | Erro interno do servidor |
| 503 | `DB_ERROR` | Banco de dados indisponivel |

---

## Limites e Performance

| Metrica | Valor |
|---------|-------|
| Limite por requisicao | 10.000 registros |
| Tempo medio (CNPJ individual) | 1-2 segundos |
| Tempo medio (/search) | 0.4-2 segundos |
| Total de empresas no banco | ~66 milhoes |
| Atualizacao dos dados | Mensal (Receita Federal) |

---

## Tabela de Codigos

### Situacao Cadastral
| Codigo | Descricao |
|--------|-----------|
| 01 | Nula |
| 02 | Ativa |
| 03 | Suspensa |
| 04 | Inapta |
| 08 | Baixada |

### Porte
| Codigo | Descricao |
|--------|-----------|
| 00 | Nao Informado |
| 01 | Microempresa |
| 03 | Empresa de Pequeno Porte |
| 05 | Demais |

### Tipo
| Codigo | Descricao |
|--------|-----------|
| 1 | Matriz |
| 2 | Filial |

---

## Suporte

- **Repositorio**: Pesca Lead - CNPJ
- **Documentacao**: Este arquivo
- **Status**: Producao

---

*Documentacao gerada em 2025-12-17*
*Versao da API: cnpj-api v7*
