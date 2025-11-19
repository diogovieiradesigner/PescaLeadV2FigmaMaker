import { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { ChatView } from './components/ChatView';
import { EditLeadModal } from './components/EditLeadModal';
import { AddFunnelModal } from './components/AddFunnelModal';
import { EditFunnelModal } from './components/EditFunnelModal';
import { StatsBar } from './components/StatsBar';
import { mockFunnels } from './data/mockData';
import { ViewMode, CRMLead } from './types/crm';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [currentView, setCurrentView] = useState<'pipeline' | 'chat' | 'dashboard' | 'settings'>('pipeline');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [isAddFunnelModalOpen, setIsAddFunnelModalOpen] = useState(false);
  const [isEditFunnelModalOpen, setIsEditFunnelModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [currentFunnelId, setCurrentFunnelId] = useState('sales-pipeline');
  const [funnels, setFunnels] = useState(mockFunnels);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');

  const currentFunnel = funnels.find((f) => f.id === currentFunnelId);

  // Calculate stats
  const stats = useMemo(() => {
    if (!currentFunnel) return { totalDeals: 0, totalValue: 0, activeLeads: 0, conversionRate: 0 };

    const allLeads = currentFunnel.columns.flatMap((col) => col.leads);
    return {
      totalDeals: allLeads.length,
      totalValue: allLeads.reduce((sum, lead) => sum + lead.dealValue, 0),
      activeLeads: allLeads.filter((lead) => lead.priority === 'high').length,
      conversionRate: 34,
    };
  }, [currentFunnel]);

  // Get all leads for list view
  const allLeads = useMemo(() => {
    if (!currentFunnel) return [];
    return currentFunnel.columns.flatMap((col) => col.leads);
  }, [currentFunnel]);

  // Filter leads based on search query
  const filteredFunnel = useMemo(() => {
    if (!currentFunnel || !searchQuery.trim()) return currentFunnel;

    const query = searchQuery.toLowerCase();
    
    return {
      ...currentFunnel,
      columns: currentFunnel.columns.map(column => ({
        ...column,
        leads: column.leads.filter(lead => 
          lead.clientName.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.tags.some(tag => tag.toLowerCase().includes(query))
        )
      }))
    };
  }, [currentFunnel, searchQuery]);

  const filteredAllLeads = useMemo(() => {
    if (!searchQuery.trim()) return allLeads;
    
    const query = searchQuery.toLowerCase();
    return allLeads.filter(lead => 
      lead.clientName.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [allLeads, searchQuery]);

  const handleLeadMove = (leadId: string, targetColumnId: string) => {
    setFunnels((prevFunnels) =>
      prevFunnels.map((funnel) => {
        if (funnel.id !== currentFunnelId) return funnel;

        let movedLead: CRMLead | null = null;

        // Remove lead from source column
        const updatedColumns = funnel.columns.map((col) => ({
          ...col,
          leads: col.leads.filter((lead) => {
            if (lead.id === leadId) {
              movedLead = { ...lead, status: targetColumnId as any };
              return false;
            }
            return true;
          }),
        }));

        // Add lead to target column
        if (movedLead) {
          const targetColumn = updatedColumns.find((col) => col.id === targetColumnId);
          if (targetColumn) {
            targetColumn.leads.push(movedLead);
          }
        }

        return { ...funnel, columns: updatedColumns };
      })
    );
  };

  const handleLeadMoveWithPosition = (leadId: string, targetColumnId: string, targetIndex: number) => {
    setFunnels((prevFunnels) =>
      prevFunnels.map((funnel) => {
        if (funnel.id !== currentFunnelId) return funnel;

        let movedLead: CRMLead | null = null;
        let sourceColumnId: string | null = null;

        // Remove lead from source column
        const updatedColumns = funnel.columns.map((col) => ({
          ...col,
          leads: col.leads.filter((lead) => {
            if (lead.id === leadId) {
              movedLead = { ...lead, status: targetColumnId as any };
              sourceColumnId = col.id;
              return false;
            }
            return true;
          }),
        }));

        // Add lead to target column at specific position
        if (movedLead) {
          const targetColumn = updatedColumns.find((col) => col.id === targetColumnId);
          if (targetColumn) {
            // Adjust index if moving within the same column
            let insertIndex = targetIndex;
            if (sourceColumnId === targetColumnId) {
              const originalIndex = funnel.columns
                .find((col) => col.id === sourceColumnId)
                ?.leads.findIndex((lead) => lead.id === leadId) ?? -1;
              
              if (originalIndex !== -1 && originalIndex < targetIndex) {
                insertIndex = targetIndex - 1;
              }
            }
            
            targetColumn.leads.splice(insertIndex, 0, movedLead);
          }
        }

        return { ...funnel, columns: updatedColumns };
      })
    );
  };

  const handleAddCard = (columnId: string) => {
    setSelectedColumnId(columnId);
    const columnStatus = currentFunnel.columns.find(c => c.id === columnId)?.id as CRMLead['status'] || 'new';
    setSelectedLead(null);
    setModalMode('create');
    setIsEditLeadModalOpen(true);
  };

  const handleSaveLead = (lead: CRMLead) => {
    if (modalMode === 'create') {
      // Add new lead
      setFunnels((prevFunnels) =>
        prevFunnels.map((funnel) => {
          if (funnel.id !== currentFunnelId) return funnel;

          return {
            ...funnel,
            columns: funnel.columns.map((column) =>
              column.id === selectedColumnId
                ? { ...column, leads: [...column.leads, lead] }
                : column
            ),
          };
        })
      );
    } else {
      // Update existing lead
      setFunnels((prevFunnels) =>
        prevFunnels.map((funnel) => {
          if (funnel.id !== currentFunnelId) return funnel;

          return {
            ...funnel,
            columns: funnel.columns.map((column) => ({
              ...column,
              leads: column.leads.map((l) => 
                l.id === lead.id ? lead : l
              ),
            })),
          };
        })
      );
    }

    setSelectedLead(null);
    setIsEditLeadModalOpen(false);
  };

  const handleLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
    setIsEditLeadModalOpen(true);
    setModalMode('edit');
  };

  const handleEditLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
    setIsEditLeadModalOpen(true);
    setModalMode('edit');
  };

  const handleSaveFunnel = (funnelName: string, columns: { id: string; name: string }[]) => {
    const newFunnelId = `funnel-${Date.now()}`;
    const newFunnel = {
      id: newFunnelId,
      name: funnelName,
      columns: columns.map((col) => ({
        id: col.id,
        title: col.name,
        leads: [],
      })),
    };

    setFunnels((prev) => [...prev, newFunnel]);
    setCurrentFunnelId(newFunnelId);
    setIsAddFunnelModalOpen(false);
  };

  const handleEditFunnel = (funnelName: string, columns: { id: string; name: string }[]) => {
    setFunnels((prevFunnels) =>
      prevFunnels.map((funnel) => {
        if (funnel.id !== currentFunnelId) return funnel;

        // Map existing columns and new columns
        const updatedColumns = columns.map((col) => {
          const existingColumn = funnel.columns.find((c) => c.id === col.id);
          
          if (existingColumn) {
            // Update existing column name
            return {
              ...existingColumn,
              title: col.name,
            };
          } else {
            // Add new column
            return {
              id: col.id,
              title: col.name,
              leads: [],
            };
          }
        });

        return {
          ...funnel,
          name: funnelName,
          columns: updatedColumns,
        };
      })
    );

    setIsEditFunnelModalOpen(false);
  };

  if (!currentFunnel) {
    return (
      <div className="h-screen bg-true-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        theme={theme}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'chat' ? (
          <ChatView theme={theme} onThemeToggle={toggleTheme} />
        ) : (
          <>
            {/* Header */}
            <Header
              currentFunnel={currentFunnelId}
              funnels={funnels}
              onFunnelChange={setCurrentFunnelId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSettingsClick={() => {}}
              theme={theme}
              onThemeToggle={toggleTheme}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewFunnelClick={() => setIsAddFunnelModalOpen(true)}
              onEditFunnelClick={() => setIsEditFunnelModalOpen(true)}
            />

            {/* Stats Bar */}
            <StatsBar
              totalDeals={stats.totalDeals}
              totalValue={stats.totalValue}
              activeLeads={stats.activeLeads}
              conversionRate={stats.conversionRate}
              theme={theme}
            />

            {/* View Content */}
            {viewMode === 'kanban' ? (
              <KanbanBoard
                columns={filteredFunnel.columns}
                onLeadMove={handleLeadMove}
                onLeadMoveWithPosition={handleLeadMoveWithPosition}
                onAddCard={handleAddCard}
                onLeadClick={handleLeadClick}
                theme={theme}
              />
            ) : (
              <ListView 
                leads={filteredAllLeads} 
                theme={theme}
                onLeadClick={handleLeadClick}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Lead Modal */}
      <EditLeadModal
        isOpen={isEditLeadModalOpen}
        onClose={() => setIsEditLeadModalOpen(false)}
        lead={selectedLead}
        onSave={handleSaveLead}
        theme={theme}
        mode={modalMode}
        initialStatus={selectedColumnId as CRMLead['status'] | undefined}
      />

      {/* Add Funnel Modal */}
      <AddFunnelModal
        isOpen={isAddFunnelModalOpen}
        onClose={() => setIsAddFunnelModalOpen(false)}
        theme={theme}
        onSave={handleSaveFunnel}
      />

      {/* Edit Funnel Modal */}
      <EditFunnelModal
        isOpen={isEditFunnelModalOpen}
        onClose={() => setIsEditFunnelModalOpen(false)}
        theme={theme}
        onSave={handleEditFunnel}
        currentFunnelName={currentFunnel.name}
        currentColumns={currentFunnel.columns.map((col) => ({
          id: col.id,
          name: col.title,
        }))}
      />
    </div>
  );
}