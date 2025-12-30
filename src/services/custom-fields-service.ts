/**
 * Custom Fields Service
 * Gerencia campos personalizados do CRM
 */

import { supabase } from '../utils/supabase/client';
import type { CustomField } from '../types/crm';

// ============================================
// TIPOS
// ============================================

export interface CustomFieldDefinition {
  id: string;
  workspace_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'textarea' | 'select' | 'multi_select' | 'checkbox';
  options?: string[];
  is_required: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomFieldValue {
  id?: string;
  lead_id: string;
  custom_field_id: string;
  value: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// GET CUSTOM FIELDS BY WORKSPACE
// ============================================

export async function getCustomFieldsByWorkspace(workspaceId: string): Promise<{
  fields: CustomFieldDefinition[];
  error: Error | null;
}> {
  try {
    const { data: fields, error: fieldsError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position');

    if (fieldsError) {
      console.error('[CUSTOM FIELDS] Erro ao buscar campos:', fieldsError);
      return { fields: [], error: fieldsError };
    }

    return { fields: fields || [], error: null };

  } catch (error) {
    console.error('[CUSTOM FIELDS] Erro inesperado:', error);
    return { fields: [], error: error as Error };
  }
}

// ============================================
// GET CUSTOM FIELD VALUES BY LEAD
// ============================================

export async function getCustomFieldValuesByLead(leadId: string): Promise<{
  values: CustomFieldValue[];
  error: Error | null;
}> {
  try {
    const { data: values, error: valuesError } = await supabase
      .from('lead_custom_values')
      .select('*')
      .eq('lead_id', leadId);

    if (valuesError) {
      console.error('[CUSTOM FIELDS] Erro ao buscar valores:', valuesError);
      return { values: [], error: valuesError };
    }

    return { values: values || [], error: null };

  } catch (error) {
    console.error('[CUSTOM FIELDS] Erro inesperado:', error);
    return { values: [], error: error as Error };
  }
}

// ============================================
// SAVE CUSTOM FIELD VALUES
// ============================================

export async function saveCustomFieldValues(
  leadId: string,
  customFields: CustomField[],
  workspaceId: string
): Promise<{ error: Error | null }> {
  try {
    if (!customFields || customFields.length === 0) {
      return { error: null };
    }

    // 1. Buscar definições dos campos personalizados do workspace
    const { data: fieldDefinitions, error: fieldDefsError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (fieldDefsError) {
      console.error('[CUSTOM FIELDS] Erro ao buscar definições:', fieldDefsError);
      return { error: fieldDefsError };
    }

    // 2. Criar um mapa de field_name -> field_id
    const fieldNameToIdMap = new Map<string, string>();
    (fieldDefinitions || []).forEach((def: CustomFieldDefinition) => {
      fieldNameToIdMap.set(def.name.toLowerCase(), def.id);
    });

    // 3. Preparar valores para inserir/atualizar
    const valuesToUpsert: Array<{
      lead_id: string;
      custom_field_id: string;
      value: string | null;
    }> = [];

    for (const field of customFields) {
      const fieldId = fieldNameToIdMap.get(field.fieldName.toLowerCase());
      
      if (!fieldId) {
        // Se o campo não existe na tabela custom_fields, criar
        const { data: newFieldDef, error: createFieldError } = await supabase
          .from('custom_fields')
          .insert({
            workspace_id: workspaceId,
            name: field.fieldName,
            field_type: field.fieldType,
            is_required: false,
          })
          .select()
          .single();

        if (createFieldError) {
          console.error('[CUSTOM FIELDS] Erro ao criar definição de campo:', createFieldError);
          continue;
        }

        if (newFieldDef) {
          fieldNameToIdMap.set(field.fieldName.toLowerCase(), newFieldDef.id);
          valuesToUpsert.push({
            lead_id: leadId,
            custom_field_id: newFieldDef.id,
            value: field.fieldValue || null,
          });
        }
      } else {
        valuesToUpsert.push({
          lead_id: leadId,
          custom_field_id: fieldId,
          value: field.fieldValue || null,
        });
      }
    }

    // 4. Fazer upsert dos valores
    if (valuesToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('lead_custom_values')
        .upsert(valuesToUpsert, {
          onConflict: 'lead_id,custom_field_id',
        });

      if (upsertError) {
        console.error('[CUSTOM FIELDS] Erro ao salvar valores:', upsertError);
        return { error: upsertError };
      }

    }

    return { error: null };

  } catch (error) {
    console.error('[CUSTOM FIELDS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// DELETE CUSTOM FIELD VALUES BY LEAD
// ============================================

export async function deleteCustomFieldValuesByLead(leadId: string): Promise<{
  error: Error | null;
}> {
  try {
    const { error: deleteError } = await supabase
      .from('lead_custom_values')
      .delete()
      .eq('lead_id', leadId);

    if (deleteError) {
      console.error('[CUSTOM FIELDS] Erro ao deletar valores:', deleteError);
      return { error: deleteError };
    }

    return { error: null };

  } catch (error) {
    console.error('[CUSTOM FIELDS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// DELETE SINGLE CUSTOM FIELD VALUE
// ============================================

export async function deleteCustomFieldValue(
  leadId: string,
  customFieldId: string
): Promise<{ error: Error | null }> {
  try {
    const { error: deleteError } = await supabase
      .from('lead_custom_values')
      .delete()
      .eq('lead_id', leadId)
      .eq('custom_field_id', customFieldId);

    if (deleteError) {
      console.error('[CUSTOM FIELDS] Erro ao deletar valor do campo:', deleteError);
      return { error: deleteError };
    }

    return { error: null };

  } catch (error) {
    console.error('[CUSTOM FIELDS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// LOAD CUSTOM FIELDS FOR LEAD
// ============================================

/**
 * Carrega os campos personalizados com seus valores para um lead específico
 */
export async function loadCustomFieldsForLead(
  leadId: string,
  workspaceId: string
): Promise<{
  customFields: CustomField[];
  error: Error | null;
}> {
  try {
    // 1. Buscar valores do lead
    const { data: values, error: valuesError } = await supabase
      .from('lead_custom_values')
      .select(`
        id,
        custom_field_id,
        value,
        custom_fields (
          id,
          name,
          field_type
        )
      `)
      .eq('lead_id', leadId);

    if (valuesError) {
      console.error('[CUSTOM FIELDS] Erro ao carregar campos:', valuesError);
      return { customFields: [], error: valuesError };
    }


    // 2. Converter para formato frontend
    const customFields: CustomField[] = (values || []).map((v: any) => ({
      id: v.custom_field_id,
      fieldName: v.custom_fields?.name || '',
      fieldType: v.custom_fields?.field_type || 'text',
      fieldValue: v.value || '',
    }));


    return { customFields, error: null };

  } catch (error) {
    console.error('[CUSTOM FIELDS] Erro inesperado:', error);
    return { customFields: [], error: error as Error };
  }
}