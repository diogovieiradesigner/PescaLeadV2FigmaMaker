import { useState, useEffect, useCallback } from 'react';
import { 
  getExtractions, 
  getRecentExtractionRuns,
  getExtractionStats,
  createExtraction,
  updateExtraction,
  deleteExtraction,
  toggleExtractionActive,
  executeExtraction,
  LeadExtraction,
  LeadExtractionRun,
  ExtractionStats,
  CreateExtractionData,
  UpdateExtractionData
} from '../services/extraction-service';
import { supabase } from '../utils/supabase/client';

export function useExtractionData(workspaceId: string) {
  const [extractions, setExtractions] = useState<LeadExtraction[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [stats, setStats] = useState<ExtractionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchData = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const [extractionsData, runsData, statsData] = await Promise.all([
        getExtractions(workspaceId),
        getRecentExtractionRuns(workspaceId),
        getExtractionStats(workspaceId)
      ]);

      setExtractions(extractionsData);
      setRecentRuns(runsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching extraction data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================

  useEffect(() => {
    if (!workspaceId) return;

    // Subscribe to extractions changes
    const extractionsSubscription = supabase
      .channel(`extractions-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_extractions',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          console.log('🔄 [REALTIME] Extractions changed:', payload);
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to runs changes
    const runsSubscription = supabase
      .channel(`extraction-runs-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_extraction_runs',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          console.log('🔄 [REALTIME] Extraction runs changed:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(extractionsSubscription);
      supabase.removeChannel(runsSubscription);
    };
  }, [workspaceId, fetchData]);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const handleCreateExtraction = async (data: CreateExtractionData) => {
    try {
      const newExtraction = await createExtraction(data);
      setExtractions(prev => [newExtraction, ...prev]);
      return newExtraction;
    } catch (err) {
      console.error('Error creating extraction:', err);
      throw err;
    }
  };

  const handleUpdateExtraction = async (extractionId: string, data: UpdateExtractionData) => {
    try {
      const updated = await updateExtraction(extractionId, data);
      setExtractions(prev => 
        prev.map(e => e.id === extractionId ? updated : e)
      );
      return updated;
    } catch (err) {
      console.error('Error updating extraction:', err);
      throw err;
    }
  };

  const handleDeleteExtraction = async (extractionId: string) => {
    try {
      await deleteExtraction(extractionId);
      setExtractions(prev => prev.filter(e => e.id !== extractionId));
    } catch (err) {
      console.error('Error deleting extraction:', err);
      throw err;
    }
  };

  const handleToggleActive = async (extractionId: string, isActive: boolean) => {
    try {
      const updated = await toggleExtractionActive(extractionId, isActive);
      setExtractions(prev => 
        prev.map(e => e.id === extractionId ? updated : e)
      );
      return updated;
    } catch (err) {
      console.error('Error toggling extraction:', err);
      throw err;
    }
  };

  const handleExecuteExtraction = async (extractionId: string) => {
    try {
      const run = await executeExtraction(extractionId);
      // O realtime vai atualizar automaticamente
      return run;
    } catch (err) {
      console.error('Error executing extraction:', err);
      throw err;
    }
  };

  return {
    extractions,
    recentRuns,
    stats,
    loading,
    error,
    refresh: fetchData,
    createExtraction: handleCreateExtraction,
    updateExtraction: handleUpdateExtraction,
    deleteExtraction: handleDeleteExtraction,
    toggleActive: handleToggleActive,
    executeExtraction: handleExecuteExtraction
  };
}
