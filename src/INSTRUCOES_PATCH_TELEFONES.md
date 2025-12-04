# 📞 Como Aplicar o Patch de Telefones do Scraping

## Problema
Os telefones extraídos do scraping com estrutura `{number, source, verified, whatsapp}` estão sendo exibidos como JSON bruto ao invés de formatados visualmente.

## Solução

### Opção 1: Usar o script automático (RECOMENDADO)
```bash
node apply-phone-patch.js
```

### Opção 2: Aplicar manualmente

1. Abra o arquivo `/components/LeadFullViewModal.tsx`

2. Localize a linha **959** que contém:
   ```tsx
   // ===== ARRAY DE TELEFONES =====
   ```

3. **ANTES** dessa linha (na linha 958, após o fechamento do bloco de emails), adicione o código abaixo:

```tsx
// ===== ARRAY DE TELEFONES (SCRAPING) =====
if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].number && !parsedValue[0].with_country) {
   const phones = parsedValue as Array<{
      number: string;
      source?: string;
      verified?: boolean;
      whatsapp?: boolean;
   }>;
   
   const updatePhone = (index: number, key: string, value: any) => {
      const updated = [...phones];
      updated[index] = { ...updated[index], [key]: value };
      handleCustomFieldChange(field.id, JSON.stringify(updated));
   };
   
   return (
      <div className="space-y-2">
         {phones.map((phone, idx) => {
            const itemId = `${field.id}-${idx}`;
            const isItemEditing = editingFieldId === itemId;
            const isWhatsAppLink = phone.number?.startsWith('http');
            const displayNumber = isWhatsAppLink 
               ? phone.number.replace('http://wa.me/', '').replace('https://wa.me/', '').replace('https://api.whatsapp.com/send?phone=', '')
               : phone.number;
            
            return (
               <div 
                  key={idx}
                  onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                  className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                     isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                  } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
               >
                  <Phone className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                     {isItemEditing ? (
                        <input
                           type="text"
                           value={phone.number}
                           onChange={(e) => updatePhone(idx, 'number', e.target.value)}
                           onBlur={() => setEditingFieldId(null)}
                           autoFocus
                           onClick={(e) => e.stopPropagation()}
                           className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                        />
                     ) : (
                        <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                           {displayNumber}
                        </div>
                     )}
                     <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {phone.source && (
                           <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                              {phone.source}
                           </span>
                        )}
                        {phone.whatsapp && (
                           <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">
                              WhatsApp
                           </span>
                        )}
                        {phone.verified && (
                           <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                     </div>
                  </div>
               </div>
            );
         })}
      </div>
   );
}

```

4. Salve o arquivo.

## Resultado Esperado

Após aplicar o patch, os telefones do scraping serão exibidos assim:

- **✅ Cards organizados** - Cada telefone em um card separado
- **📱 Ícone de telefone** - Visual consistente
- **🏷️ Badges informativos** - Source (scraping), WhatsApp (se aplicável)
- **✅ Indicador de verificação** - Se o telefone foi verificado
- **🔗 Links do WhatsApp** - Convertidos automaticamente para número legível
  - `http://wa.me/5511970777136` → `5511970777136`
  - `https://api.whatsapp.com/send?phone=...` → número limpo
- **✏️ Edição inline** - Clique para editar

## Detalhes Técnicos

### Condição de Detecção
O código detecta arrays de telefones que:
- ✅ Possuem a propriedade `number`
- ❌ NÃO possuem a propriedade `with_country` (para não conflitar com os telefones normais)

### Campos Suportados
- `number` (string) - Obrigatório
- `source` (string) - Opcional (ex: "scraping")
- `verified` (boolean) - Opcional
- `whatsapp` (boolean) - Opcional

### Estrutura de Exemplo
```json
[
  {
    "number": "(11) 3826-3611",
    "source": "scraping",
    "verified": false
  },
  {
    "number": "http://wa.me/5511970777136",
    "source": "scraping",
    "verified": false,
    "whatsapp": true
  }
]
```
