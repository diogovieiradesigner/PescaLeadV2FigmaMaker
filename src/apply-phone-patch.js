// Script para aplicar o patch dos telefones do scraping
// Execute: node apply-phone-patch.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'LeadFullViewModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Código a ser inserido
const newPhoneBlock = `                                                // ===== ARRAY DE TELEFONES (SCRAPING) =====
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
                                                            const itemId = \`\${field.id}-\${idx}\`;
                                                            const isItemEditing = editingFieldId === itemId;
                                                            const isWhatsAppLink = phone.number?.startsWith('http');
                                                            const displayNumber = isWhatsAppLink 
                                                               ? phone.number.replace('http://wa.me/', '').replace('https://wa.me/', '').replace('https://api.whatsapp.com/send?phone=', '')
                                                               : phone.number;
                                                            
                                                            return (
                                                               <div 
                                                                  key={idx}
                                                                  onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                  className={\`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all \${
                                                                     isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                  } \${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}\`}
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
                                                                           className={\`w-full text-sm bg-transparent border-none outline-none \${isDark ? 'text-white' : 'text-gray-900'}\`}
                                                                        />
                                                                     ) : (
                                                                        <div className={\`text-sm \${isDark ? 'text-white' : 'text-gray-900'}\`}>
                                                                           {displayNumber}
                                                                        </div>
                                                                     )}
                                                                     <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        {phone.source && (
                                                                           <span className={\`text-xs \${isDark ? 'text-white/40' : 'text-gray-400'}\`}>
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
                                                
                                                `;

// Procurar pela linha exata e inserir antes dela
const searchPattern = /(\s+\/\/ ===== ARRAY DE TELEFONES =====\s+if \(Array\.isArray\(parsedValue\) && parsedValue\.length > 0 && parsedValue\[0\]\.with_country\))/;

if (content.match(searchPattern)) {
  content = content.replace(searchPattern, newPhoneBlock + '$1');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Patch aplicado com sucesso!');
} else {
  console.error('❌ Não foi possível encontrar o padrão no arquivo');
}
