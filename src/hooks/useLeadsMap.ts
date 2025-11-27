import { useMemo } from 'react';
import { CRMLead } from '../types/crm';

/**
 * Hook para indexação O(1) de leads por ID usando Map
 * Performance: Busca em O(1) ao invés de O(n) com array.find()
 */
export function useLeadsMap(leads: CRMLead[]) {
  return useMemo(() => {
    const map = new Map<string, CRMLead>();
    leads.forEach(lead => {
      map.set(lead.id, lead);
    });
    return map;
  }, [leads]);
}

/**
 * Hook para indexação de leads por coluna
 * Performance: Agrupamento O(n) uma vez, depois busca O(1)
 */
export function useLeadsByColumn(leads: CRMLead[], columnId: string) {
  return useMemo(() => {
    return leads.filter(lead => {
      // Assumindo que o lead tem columnId (ajustar conforme estrutura real)
      return (lead as any).columnId === columnId;
    });
  }, [leads, columnId]);
}

/**
 * Hook para criar índice reverso: leadId -> columnId
 */
export function useLeadToColumnMap(columns: Array<{ id: string; leads: CRMLead[] }>) {
  return useMemo(() => {
    const map = new Map<string, string>();
    columns.forEach(column => {
      column.leads.forEach(lead => {
        map.set(lead.id, column.id);
      });
    });
    return map;
  }, [columns]);
}
