# ✅ Correção: Mapper client_name

## 🔍 Problema Identificado

O mapper estava usando `dbLead.client_name || 'Sem nome'` como fallback, mas segundo o usuário:

> "O lead nunca em nenhuma possibilidade fica sem o nome, o nome do lead que é que aparece o card é o mesmo nome que está no perfil do lead que vem da ficha do google maps, não existe isso de vir sem nome"

## ✅ Correção Aplicada

**Antes:**
```typescript
clientName: dbLead.client_name || 'Sem nome',
```

**Depois:**
```typescript
clientName: dbLead.client_name || '', // ✅ Removido fallback "Sem nome" - sempre vem do Google Maps
```

## 📝 Justificativa

1. **Google Maps sempre retorna um nome:** O campo `place.title` sempre existe na resposta da API do Google Maps
2. **Extração garante nome:** Durante a extração, `client_name: place.title || 'Sem nome'` só usa "Sem nome" se `place.title` realmente não existir (o que não acontece)
3. **Migração garante nome:** A função de migração já foi corrigida para usar `extracted_data->>'title'` se necessário

## ✅ Resultado

- Se `client_name` for `NULL` ou vazio, retorna string vazia `''` em vez de "Sem nome"
- O frontend pode tratar string vazia como necessário
- Mantém a consistência: o nome sempre vem do Google Maps

