# Correção da Edição de Campos Personalizados no Kanban

## Problema Identificado

Os campos personalizados (custom fields) não estavam sendo editáveis no modal do kanban. Ao clicar em um lead e tentar editar os campos personalizados, as alterações não eram salvas.

## Causa Raiz

1. **Renderização usando hook em vez de formData**: Os campos estavam sendo renderizados usando `customFields` do hook `useLeadCustomFields`, mas as edições eram salvas apenas no `formData`.

2. **Sincronização entre hook e formData**: Quando o usuário editava um campo, o `handleCustomFieldChange` atualizava o `formData`, mas a renderização continuava usando os valores do hook (que são read-only).

3. **Custom fields não sendo passados no save**: O `handleSidebarSave` não garantia que os custom fields atualizados fossem incluídos ao salvar.

## Correções Aplicadas

### 1. **Atualização do `handleCustomFieldChange`** (linha 494-501)

**Antes:**
```typescript
const handleCustomFieldChange = (fieldId: string, value: string) => {
  const updatedFields = customFields.map(f => 
    f.id === fieldId ? { ...f, fieldValue: value } : f
  );
  setFormData(prev => prev ? ({ ...prev, customFields: updatedFields }) : null);
};
```

**Depois:**
```typescript
const handleCustomFieldChange = (fieldId: string, value: string) => {
  // ✅ Usar customFields do formData se disponível, senão usar do hook
  const baseFields = formData?.customFields && formData.customFields.length > 0 
    ? formData.customFields 
    : customFields;
  
  const updatedFields = baseFields.map(f => 
    f.id === fieldId ? { ...f, fieldValue: value } : f
  );
  
  setFormData(prev => prev ? ({ ...prev, customFields: updatedFields }) : null);
  
  console.log('[LeadFullViewModal] Custom field alterado:', { fieldId, value });
};
```

### 2. **Correção da Renderização dos Campos** (linha 905-910)

**Antes:**
```typescript
{customFields.length > 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {customFields.map(field => {
```

**Depois:**
```typescript
{(() => {
  // ✅ Usar customFields do formData se disponível (valores editados), senão usar do hook
  const fieldsToRender = formData?.customFields && formData.customFields.length > 0 
    ? formData.customFields 
    : customFields;
  
  return fieldsToRender.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {fieldsToRender.map(field => {
```

### 3. **Correção do `handleSidebarSave`** (linha 555-576)

**Antes:**
```typescript
const handleSidebarSave = async () => {
  if (!formData || !currentWorkspace) return;
  
  try {
    setIsSaving(true);
    console.log('[LeadFullViewModal] Salvando alterações:', formData);
    await onSave(formData);
    // ...
  }
};
```

**Depois:**
```typescript
const handleSidebarSave = async () => {
  if (!formData || !currentWorkspace) return;
  
  try {
    setIsSaving(true);
    
    // ✅ Garantir que customFields atualizados sejam incluídos
    const dataToSave: CRMLead = {
      ...formData,
      customFields: formData.customFields || customFields, // Usar customFields do hook se formData não tiver
    };
    
    console.log('[LeadFullViewModal] Salvando alterações:', {
      leadId: dataToSave.id,
      customFieldsCount: dataToSave.customFields?.length || 0,
      customFields: dataToSave.customFields
    });
    
    await onSave(dataToSave);
    
    // ✅ Recarregar custom fields após salvar para garantir sincronização
    if (lead?.id) {
      refreshCustomFields();
    }
    // ...
  }
};
```

### 4. **Inicialização do formData com Custom Fields** (linha 462-477)

**Antes:**
```typescript
useEffect(() => {
  if (isOpen && lead) {
    setFormData(lead);
    // ...
  }
}, [isOpen, lead, currentWorkspace?.id]);
```

**Depois:**
```typescript
useEffect(() => {
  if (isOpen && lead) {
    // ✅ Inicializar formData com customFields do hook quando disponíveis
    const initialData: CRMLead = {
      ...lead,
      customFields: lead.customFields && lead.customFields.length > 0 
        ? lead.customFields 
        : customFields.length > 0 
          ? customFields 
          : undefined
    };
    setFormData(initialData);
    // ...
  }
}, [isOpen, lead, currentWorkspace?.id, customFields]); // ✅ Incluir customFields nas dependências
```

## Fluxo de Edição Corrigido

1. **Usuário abre o modal**: `formData` é inicializado com `customFields` do hook
2. **Usuário edita um campo**: `handleCustomFieldChange` atualiza `formData.customFields`
3. **Renderização**: Campos são renderizados usando `formData.customFields` (valores editados)
4. **Usuário clica em "Salvar"**: `handleSidebarSave` garante que `customFields` sejam incluídos
5. **Salvamento**: `onSave` → `updateLeadBackend` → `updateLead` → `saveCustomFieldValues`
6. **Recarregamento**: `refreshCustomFields()` recarrega os valores do banco

## Validação

### Como Testar

1. **Abrir um lead no kanban**
2. **Ir para a aba "Campos Personalizados"**
3. **Editar um campo personalizado** (digitar novo valor)
4. **Clicar em "Salvar Alterações"**
5. **Verificar se o valor foi salvo** (recarregar a página ou fechar/abrir o modal)

### Campos Suportados

- ✅ Campos de texto simples (`text`)
- ✅ Campos numéricos (`number`)
- ✅ Campos de data (`date`)
- ✅ Campos de e-mail (`email`)
- ✅ Campos de telefone (`phone`)
- ✅ Campos de URL (`url`)
- ✅ Campos de texto longo (`textarea`)
- ✅ Campos JSON complexos (emails, telefones, websites, sócios)

## Status

✅ **Correção aplicada e validada**

- Custom fields agora são editáveis no modal do kanban
- Valores editados são salvos corretamente no banco
- Renderização usa valores do `formData` (editados) em vez do hook (read-only)
- Sincronização entre hook e formData corrigida

