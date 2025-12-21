# 📊 Análise Completa: Lead "Material de Construção HH Sobrinho"

## 🎯 Lead Identificado

**Lead ID:** `7d021e87-b51c-48a3-b877-e95f471c4c04`  
**Nome:** Material de Construção HH Sobrinho  
**Workspace ID:** `5adbffd6-830e-4737-b415-39b291f3c940`  
**Status:** ✅ Migrado para CRM (`leads` table)  
**Data de Criação:** 2025-12-06 11:12:09

---

## 📋 Dados Disponíveis nas Tabelas

### **1. Tabela `leads` (CRM Principal)**

```json
{
  "id": "7d021e87-b51c-48a3-b877-e95f471c4c04",
  "workspace_id": "5adbffd6-830e-4737-b415-39b291f3c940",
  "funnel_id": "f85e4ece-9f2a-445f-8979-bf2ab600e9e0",
  "column_id": "5ea8662b-c37d-4daa-9b9f-f88464808980",
  "client_name": "Material de Construção HH Sobrinho",
  "company": "Material de Construção HH Sobrinho",
  "whatsapp_valid": false,
  "whatsapp_jid": null,
  "whatsapp_name": null,
  "lead_extraction_id": "4b4e843e-7a87-4f89-828e-4994a8930062",
  "lead_extraction_run_id": "230f0f5d-0874-4590-b8f6-d67d55281a10",
  "status": "active",
  "created_at": "2025-12-06 11:12:09",
  "updated_at": "2025-12-07 17:35:39"
}
```

**Observações:**
- ✅ Lead migrado com sucesso
- ❌ WhatsApp não validado (`whatsapp_valid = false`)
- ✅ Vinculado à extração e run específicos

---

### **2. Tabela `lead_extraction_staging` (Dados Enriquecidos)**

#### **Dados Básicos:**
- **Client Name:** Material de Construção HH Sobrinho
- **CNPJ Normalizado:** `04300352000113`
- **Domain:** `hhsobrinho.com.br`
- **Status Extraction:** `google_fetched`
- **Status Enrichment:** `pending` (⚠️ Ainda não completo)
- **Filter Passed:** `false` (⚠️ Mas foi migrado mesmo assim?)
- **Should Migrate:** `false`
- **Migrated Lead ID:** `7d021e87-b51c-48a3-b877-e95f471c4c04`

#### **Arrays Consolidados:**

**Phones:**
```json
[
  {
    "type": "landline",
    "number": "2124114678",
    "source": "serpdev",
    "verified": false,
    "whatsapp": false,
    "formatted": "(21) 2411-4678",
    "with_country": "+55 (21) 2411-4678"
  }
]
```

**Emails:**
```json
[]  // ⚠️ Array vazio, mas tem email no scraping_data!
```

**Websites:**
```json
[
  {
    "url": "http://www.hhsobrinho.com.br/",
    "type": "main",
    "domain": "hhsobrinho.com.br",
    "source": "serpdev"
  }
]
```

**Campos Primários:**
- `primary_phone`: `2124114678`
- `primary_email`: `null` (⚠️ Mas tem email no scraping!)
- `primary_website`: `http://www.hhsobrinho.com.br/`

---

### **3. Dados de Enriquecimento**

#### **3.1. CNPJ Data (✅ Completo)**

```json
{
  "cnpj": "04300352000113",
  "razao_social": "H H SOBRINHO MATERIAIS DE CONSTRUCOES",
  "nome_fantasia": "",
  "situacao_cadastral": 2,
  "descricao_situacao_cadastral": "ATIVA",
  "porte": "MICRO EMPRESA",
  "capital_social": 0,
  "data_inicio_atividade": "2001-02-15",
  "cnae_fiscal": 4744099,
  "cnae_fiscal_descricao": "Comércio varejista de materiais de construção em geral",
  "cnaes_secundarios": [
    {
      "codigo": 4744005,
      "descricao": "Comércio varejista de materiais de construção não especificados anteriormente"
    },
    {
      "codigo": 4930201,
      "descricao": "Transporte rodoviário de carga, exceto produtos perigosos e mudanças, municipal."
    },
    {
      "codigo": 4930202,
      "descricao": "Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional"
    }
  ],
  "logradouro": "JOSE TELES VALANZUELA",
  "numero": "SN",
  "complemento": " PAL 38030 QD 22 LT 15",
  "bairro": "CAMPO GRANDE",
  "cep": "23013090",
  "municipio": "RIO DE JANEIRO",
  "uf": "RJ",
  "ddd_telefone_1": "2124153317",
  "ddd_fax": "2124153317",
  "opcao_pelo_simples": true,
  "opcao_pelo_mei": false,
  "natureza_juridica": "Empresário (Individual)",
  "qsa": []
}
```

**Status:** ✅ `cnpj_enriched = true`

---

#### **3.2. WHOIS Data (✅ Completo)**

```json
{
  "handle": "hhsobrinho.com.br",
  "ldhName": "hhsobrinho.com.br",
  "status": ["active"],
  "events": [
    {
      "eventDate": "2010-11-30T20:49:58Z",
      "eventAction": "registration"
    },
    {
      "eventDate": "2025-11-19T12:13:14Z",
      "eventAction": "last changed"
    },
    {
      "eventDate": "2026-11-30T20:49:58Z",
      "eventAction": "expiration"
    }
  ],
  "entities": [
    {
      "handle": "04300352000113",
      "roles": ["registrant"],
      "publicIds": [
        {
          "type": "cnpj",
          "identifier": "04.300.352/0001-13"
        }
      ],
      "vcardArray": [
        "vcard",
        [
          ["fn", {}, "text", "H.H. Sobrinho Materiais de Construção"]
        ]
      ],
      "legalRepresentative": "Hélio Honorato Sobrinho",
      "entities": [
        {
          "roles": ["administrative"],
          "handle": "PCCMA6",
          "vcardArray": [
            "vcard",
            [
              ["fn", {}, "text", "Paulo Cesar da Cunha Mattos"],
              ["email", {}, "text", "paulomattosconsultoria@gmail.com"]
            ]
          ]
        },
        {
          "roles": ["technical"],
          "handle": "BCDSA79",
          "vcardArray": [
            "vcard",
            [
              ["fn", {}, "text", "Bruno Charles dos Santos"],
              ["email", {}, "text", "brunocharles@gtechweb.com.br"]
            ]
          ]
        }
      ]
    }
  ],
  "nameservers": [
    {
      "ldhName": "ns150.prodns.com.br"
    },
    {
      "ldhName": "ns151.prodns.com.br"
    }
  ]
}
```

**Status:** ✅ `whois_enriched = true`

**Dados Extraídos:**
- CNPJ: `04.300.352/0001-13`
- Razão Social: `H.H. Sobrinho Materiais de Construção`
- Representante Legal: `Hélio Honorato Sobrinho`
- Contato Administrativo: `Paulo Cesar da Cunha Mattos` (paulomattosconsultoria@gmail.com)
- Contato Técnico: `Bruno Charles dos Santos` (brunocharles@gtechweb.com.br)
- Data Registro: `2010-11-30`
- Data Expiração: `2026-11-30`
- Status: `active`

---

#### **3.3. Scraping Data (✅ Completo)**

```json
{
  "emails": [
    {
      "type": "main",
      "source": "scraping",
      "address": "contato@hhsobrinho.com.br",
      "verified": false
    }
  ],
  "phones": [
    {
      "number": "(21) 2411-4678",
      "source": "scraping",
      "verified": false
    }
  ],
  "pixels": {
    "pixels": {
      "google_analytics": true,
      "facebook": false,
      "google_ads": false,
      "linkedin": false,
      "twitter": false,
      "tiktok": false,
      "pinterest": false,
      "snapchat": false,
      "taboola": false,
      "outbrain": false
    },
    "have_pixels": true
  },
  "metadata": {
    "title": "HH Sobrinho - Loja de varejo especializada na comercialização de materiais de construção e acabamentos",
    "description": "Loja de varejo especializada na comercialização de materiais de construção e acabamentos",
    "og_image": ""
  },
  "checkouts": {
    "platforms": [],
    "have_checkouts": false
  },
  "performance": {
    "total_time": "13.08s"
  },
  "social_media": [
    {
      "url": "https://pt-br.facebook.com/hhsobrinho/",
      "type": "social",
      "source": "scraping",
      "platform": "facebook"
    },
    {
      "url": "https://www.instagram.com/h.h.sobrinho/",
      "type": "social",
      "source": "scraping",
      "platform": "instagram"
    }
  ]
}
```

**Status:** ✅ `scraping_enriched = true`

**Dados Extraídos:**
- ✅ Email: `contato@hhsobrinho.com.br`
- ✅ Telefone: `(21) 2411-4678`
- ✅ Facebook: `https://pt-br.facebook.com/hhsobrinho/`
- ✅ Instagram: `https://www.instagram.com/h.h.sobrinho/`
- ✅ Google Analytics: Detectado
- ❌ E-commerce: Não tem checkout
- ❌ Outras redes sociais: Não encontradas

---

#### **3.4. Extracted Data (Google Maps)**

```json
{
  "cid": "1940653039550992917",
  "phones": [
    {
      "number": "(21) 2411-4678",
      "source": "serpdev"
    }
  ],
  "emails": [],
  "websites": [
    {
      "url": "http://www.hhsobrinho.com.br/",
      "type": "main",
      "source": "serpdev"
    }
  ],
  "rating": 4.6,
  "reviews": 243,
  "reviews_count": 243,
  "address": "R. João Cirílo de Oliveira, 15 - Campo Grande, Rio de Janeiro - RJ, 23090-590",
  "category": "Loja de materiais de construção",
  "latitude": -22.87367,
  "longitude": -43.5709642,
  "source_page": 19
}
```

---

### **4. Métricas do Run**

```json
{
  "run_status": "completed",
  "found_quantity": 178,
  "created_quantity": 61,
  "filtered_out": 107
}
```

**Análise:**
- Total encontrado: 178 leads
- Criados (sem duplicatas): 61 leads
- Filtrados: 107 leads
- Taxa de aprovação: 34.3% (61/178)
- Taxa de filtragem: 60.1% (107/178)

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### **1. Email não consolidado no array `emails`**

**Problema:**
- `emails` array está vazio: `[]`
- Mas `scraping_data` tem email: `contato@hhsobrinho.com.br`
- `primary_email` está `null`

**Causa Provável:**
- Trigger `normalize_and_consolidate_staging_v2` não consolidou email do scraping
- Ou email foi adicionado após a consolidação inicial

**Impacto:**
- Lead não tem email disponível no CRM
- Filtro `require_email` falharia se aplicado

---

### **2. Status de Enriquecimento Inconsistente**

**Problema:**
- `status_enrichment = 'pending'`
- Mas todos os enriquecimentos estão completos:
  - ✅ CNPJ: `cnpj_enriched = true`
  - ✅ WHOIS: `whois_enriched = true`
  - ✅ Scraping: `scraping_enriched = true`

**Causa Provável:**
- Trigger que atualiza `status_enrichment` não está funcionando
- Ou lógica de atualização está incorreta

---

### **3. Filter Passed vs Migrated (CORRIGIDO)**

**Status Atual:**
- `filter_passed = true` ✅
- `should_migrate = true` ✅
- Lead **foi migrado** corretamente (`migrated_lead_id` preenchido)

**Observação:** Query anterior mostrou valores antigos, query atualizada mostra valores corretos.

---

### **4. WhatsApp não validado**

**Problema:**
- `whatsapp_valid = false`
- `whatsapp_jid = null`
- Telefone é fixo (`landline`), então pode não ter WhatsApp mesmo

**Status:** ✅ Esperado (telefone fixo geralmente não tem WhatsApp)

---

## 📊 Resumo dos Dados Disponíveis

### **Dados Consolidados:**

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| **Telefones** | 1 | ✅ Consolidado |
| **Emails** | 1 (no scraping, não consolidado) | ⚠️ Problema |
| **Websites** | 1 | ✅ Consolidado |
| **Redes Sociais** | 2 (Facebook, Instagram) | ✅ No scraping_data |
| **CNPJ** | Completo (18 campos) | ✅ Enriquecido |
| **WHOIS** | Completo (10 campos) | ✅ Enriquecido |
| **Scraping** | Completo (~15 campos) | ✅ Enriquecido |
| **Google Maps** | Completo (8 campos) | ✅ Enriquecido |

### **Custom Fields Populados (37 campos):**

#### **Google Maps (8 campos):**
- ✅ Avaliações: `243`
- ✅ Categoria: `Loja de materiais de construção`
- ✅ Endereço: `R. João Cirílo de Oliveira, 15 - Campo Grande, Rio de Janeiro - RJ, 23090-590`
- ✅ Latitude: `-22.87367`
- ✅ Longitude: `-43.5709642`
- ✅ Rating: `4.6`
- ✅ Telefone Principal: `2124114678`
- ✅ Website Principal: `http://www.hhsobrinho.com.br/`

#### **CNPJ (12 campos):**
- ✅ CNPJ: `04.300.352/0001-13`
- ✅ Razão Social: `H H SOBRINHO MATERIAIS DE CONSTRUCOES`
- ✅ Nome Fantasia: `` (vazio)
- ✅ Situação Cadastral: `ATIVA`
- ✅ Porte da Empresa: `MICRO EMPRESA`
- ✅ Capital Social: `R$ .00` ⚠️ (formato incorreto, deveria ser `R$ 0,00`)
- ✅ Data Abertura Empresa: `2001-02-15`
- ✅ CNAE Principal: `Comércio varejista de materiais de construção em geral`
- ✅ Endereço CNPJ: `RUA JOSE TELES VALANZUELA, SN,  PAL 38030 QD 22 LT 15, CAMPO GRANDE, 23013090`
- ✅ Cidade/UF CNPJ: `RIO DE JANEIRO/RJ`
- ✅ Simples Nacional: `Sim`
- ✅ Sócios (JSON): `[]`

#### **WHOIS (10 campos):**
- ✅ WHOIS CNPJ: `04.300.352/0001-13`
- ✅ WHOIS Razão Social: `H.H. Sobrinho Materiais de Construção`
- ✅ WHOIS Representante Legal: `Hélio Honorato Sobrinho`
- ✅ WHOIS Responsável: `Paulo Cesar da Cunha Mattos`
- ✅ WHOIS Contato Técnico: `Bruno Charles dos Santos`
- ✅ WHOIS Email: `paulomattosconsultoria@gmail.com`
- ✅ WHOIS Data Registro: `30/11/2010`
- ✅ WHOIS Data Expiração: `30/11/2026`
- ✅ WHOIS Status: `active`
- ✅ WHOIS Nameservers: `["ns150.prodns.com.br", "ns151.prodns.com.br"]`

#### **Scraping (2 campos - INCOMPLETO):**
- ✅ Scraping Emails: `[{"type": "main", "source": "scraping", "address": "contato@hhsobrinho.com.br", "verified": false}]` ⚠️ (JSON string, não parseado)
- ✅ Scraping Telefones: `[{"number": "(21) 2411-4678", "source": "scraping", "verified": false}]` ⚠️ (JSON string, não parseado)

#### **Consolidados (3 campos):**
- ✅ Domínio: `hhsobrinho.com.br`
- ✅ Todos os Telefones (JSON): `[{"type": "landline", "number": "2124114678", ...}]` ⚠️ (JSON string)
- ✅ Todos os Websites (JSON): `[{"url": "http://www.hhsobrinho.com.br/", ...}]` ⚠️ (JSON string)

#### **WhatsApp (2 campos):**
- ✅ WhatsApp Válido: `Não`
- ✅ Tipo de Contato: `fixo`

**Total:** 37 custom fields populados

---

## 📊 Resumo Final

### **Dados Consolidados:**

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| **Telefones** | 1 | ✅ Consolidado |
| **Emails** | 1 (no scraping_data, não no array emails) | ⚠️ Problema |
| **Websites** | 1 | ✅ Consolidado |
| **Redes Sociais** | 2 (Facebook, Instagram) | ✅ No scraping_data |
| **CNPJ** | Completo (18 campos) | ✅ Enriquecido |
| **WHOIS** | Completo (10 campos) | ✅ Enriquecido |
| **Scraping** | Completo (~15 campos) | ✅ Enriquecido |
| **Google Maps** | Completo (8 campos) | ✅ Enriquecido |
| **Custom Fields** | 37 campos populados | ✅ Migrado |

### **Problemas Identificados:**

1. ⚠️ **Email não consolidado:** Email do scraping (`contato@hhsobrinho.com.br`) não está no array `emails`
2. ⚠️ **Status enrichment:** Ainda `pending` mesmo com todos os enriquecimentos completos
3. ⚠️ **Scraping dados como JSON string:** Campos "Scraping Emails" e "Scraping Telefones" salvos como JSON string ao invés de campos individuais
4. ⚠️ **Capital Social formatado incorretamente:** `R$ .00` ao invés de `R$ 0,00`

### **Pontos Positivos:**

1. ✅ Todos os enriquecimentos completos (CNPJ, WHOIS, Scraping)
2. ✅ 37 custom fields populados corretamente
3. ✅ Lead migrado com sucesso para CRM
4. ✅ Dados de Google Maps completos (rating 4.6, 243 reviews)
5. ✅ Redes sociais detectadas (Facebook, Instagram)

---

## 🎯 Próximos Passos

Aguardando suas instruções sobre as melhorias que deseja implementar!

**Dados prontos para análise:**
- ✅ Lead identificado e localizado
- ✅ Todos os dados de enriquecimento disponíveis
- ✅ Problemas identificados
- ✅ Estrutura completa mapeada
- ✅ 37 custom fields analisados

