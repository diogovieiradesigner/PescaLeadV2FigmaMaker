// TEMP FILE - Conteúdo inline editing para substituir no LeadFullViewModal.tsx

// Substituir a seção "// Se for um campo complexo (JSON), renderizar inline editável"

                                            // Se for um campo complexo (JSON), renderizar inline editável
                                            if (isComplex) {
                                               const isEditing = editingFieldId === field.id;
                                               
                                               // ===== EMAIL DO DOMÍNIO (objeto único) =====
                                               if (!Array.isArray(parsedValue) && parsedValue.address && parsedValue.source !== undefined) {
                                                  const domainEmail = parsedValue as DomainEmailEntry;
                                                  const updateField = (key: keyof DomainEmailEntry, value: any) => {
                                                     const updated = { ...domainEmail, [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div 
                                                        onClick={() => !isEditing && setEditingFieldId(field.id)}
                                                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                           isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                        } ${isEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                     >
                                                        <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                           {isEditing ? (
                                                              <input
                                                                 type="email"
                                                                 value={domainEmail.address}
                                                                 onChange={(e) => updateField('address', e.target.value)}
                                                                 onBlur={() => setEditingFieldId(null)}
                                                                 autoFocus
                                                                 className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                              />
                                                           ) : (
                                                              <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                 {domainEmail.address}
                                                              </div>
                                                           )}
                                                           <div className="flex items-center gap-2 mt-1">
                                                              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                                                                 Domínio
                                                              </span>
                                                              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                 {domainEmail.source}
                                                              </span>
                                                              {domainEmail.verified && (
                                                                 <CheckCircle className="w-3 h-3 text-green-500" />
                                                              )}
                                                           </div>
                                                        </div>
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE EMAILS =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].address && parsedValue[0].type) {
                                                  const emails = parsedValue as EmailEntry[];
                                                  const updateEmail = (index: number, key: keyof EmailEntry, value: any) => {
                                                     const updated = [...emails];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {emails.map((email, idx) => (
                                                           <div 
                                                              key={idx}
                                                              onClick={() => !isEditing && setEditingFieldId(field.id)}
                                                              className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                 isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                              } ${isEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                           >
                                                              <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                              <div className="flex-1 min-w-0">
                                                                 {isEditing ? (
                                                                    <input
                                                                       type="email"
                                                                       value={email.address}
                                                                       onChange={(e) => updateEmail(idx, 'address', e.target.value)}
                                                                       onBlur={() => setEditingFieldId(null)}
                                                                       autoFocus
                                                                       className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                    />
                                                                 ) : (
                                                                    <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                       {email.address}
                                                                    </div>
                                                                 )}
                                                                 <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                       email.type === 'main' ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'
                                                                    }`}>
                                                                       {email.type === 'main' ? 'Principal' : 'Contato'}
                                                                    </span>
                                                                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                       {email.source}
                                                                    </span>
                                                                    {email.verified && (
                                                                       <CheckCircle className="w-3 h-3 text-green-500" />
                                                                    )}
                                                                 </div>
                                                              </div>
                                                           </div>
                                                        ))}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE TELEFONES =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].with_country) {
                                                  const phones = parsedValue as PhoneEntry[];
                                                  const updatePhone = (index: number, key: keyof PhoneEntry, value: any) => {
                                                     const updated = [...phones];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {phones.map((phone, idx) => (
                                                           <div 
                                                              key={idx}
                                                              onClick={() => !isEditing && setEditingFieldId(field.id)}
                                                              className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                 isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                              } ${isEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                           >
                                                              <Phone className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                              <div className="flex-1 min-w-0">
                                                                 {isEditing ? (
                                                                    <input
                                                                       type="text"
                                                                       value={phone.with_country}
                                                                       onChange={(e) => updatePhone(idx, 'with_country', e.target.value)}
                                                                       onBlur={() => setEditingFieldId(null)}
                                                                       autoFocus
                                                                       className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                    />
                                                                 ) : (
                                                                    <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                       {phone.with_country}
                                                                    </div>
                                                                 )}
                                                                 <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                       phone.type === 'mobile' ? 'bg-purple-500/10 text-purple-500' : 'bg-gray-500/10 text-gray-500'
                                                                    }`}>
                                                                       {phone.type === 'mobile' ? 'Celular' : 'Fixo'}
                                                                    </span>
                                                                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                       {phone.source}
                                                                    </span>
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
                                                        ))}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE WEBSITES =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].url && parsedValue[0].domain) {
                                                  const websites = parsedValue as WebsiteEntry[];
                                                  const updateWebsite = (index: number, key: keyof WebsiteEntry, value: any) => {
                                                     const updated = [...websites];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {websites.map((website, idx) => (
                                                           <div 
                                                              key={idx}
                                                              onClick={() => !isEditing && setEditingFieldId(field.id)}
                                                              className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                 isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                              } ${isEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                           >
                                                              <Globe className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                              <div className="flex-1 min-w-0">
                                                                 {isEditing ? (
                                                                    <input
                                                                       type="url"
                                                                       value={website.url}
                                                                       onChange={(e) => updateWebsite(idx, 'url', e.target.value)}
                                                                       onBlur={() => setEditingFieldId(null)}
                                                                       autoFocus
                                                                       className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                                                    />
                                                                 ) : (
                                                                    <a 
                                                                       href={website.url} 
                                                                       target="_blank" 
                                                                       rel="noopener noreferrer"
                                                                       onClick={(e) => e.stopPropagation()}
                                                                       className={`text-sm break-all hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                                                    >
                                                                       {website.url}
                                                                    </a>
                                                                 )}
                                                                 <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                       website.type === 'main' 
                                                                          ? 'bg-blue-500/10 text-blue-500' 
                                                                          : website.type === 'social'
                                                                          ? 'bg-pink-500/10 text-pink-500'
                                                                          : 'bg-gray-500/10 text-gray-500'
                                                                    }`}>
                                                                       {website.type === 'main' ? 'Principal' : website.type === 'social' ? 'Rede Social' : website.type}
                                                                    </span>
                                                                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                       {website.domain}
                                                                    </span>
                                                                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                       • {website.source}
                                                                    </span>
                                                                 </div>
                                                              </div>
                                                           </div>
                                                        ))}
                                                     </div>
                                                  );
                                               }
                                               
                                               // JSON desconhecido - fallback
                                               return (
                                                  <div className={`text-sm cursor-pointer p-2 rounded transition-all ${
                                                     isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'
                                                  }`}>
                                                     {renderFieldValue(field, isDark)}
                                                  </div>
                                               );
                                            }
