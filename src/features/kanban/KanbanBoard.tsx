'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { KanbanColumn, ColumnDefinition } from './KanbanColumn';
import { KanbanCard, LeadCardData } from './KanbanCard';
import { DealHandoverModal } from './DealHandoverModal';
import { LeadInspectorDrawer } from '../inspector/LeadInspectorDrawer';

export const KANBAN_COLUMNS: ColumnDefinition[] = [
  {
    id: 'discovered',
    title: '1. Descoberto',
    shortTitle: 'Descoberto',
    description: 'Empresas locais mineradas pelo ScoutAgent',
    badgeColor: 'bg-cyan-400',
    headerBg: 'bg-slate-900/40',
  },
  {
    id: 'audited',
    title: '2. Diagnosticado BI/CRM',
    shortTitle: 'Diagnosticado',
    description: 'Dossiê de gargalo & ROI gerado pelo AuditorAgent',
    badgeColor: 'bg-blue-400',
    headerBg: 'bg-blue-950/20',
  },
  {
    id: 'drafting_copy',
    title: '3. Gerando Abordagem',
    shortTitle: 'Gerando Copy',
    description: 'Loop Copywriter + CriticAgent em 3 balões',
    badgeColor: 'bg-indigo-400',
    headerBg: 'bg-indigo-950/20',
  },
  {
    id: 'contacted',
    title: '4. Abordado no WhatsApp',
    shortTitle: 'Abordado',
    description: 'Disparo humanizado via Evolution API',
    badgeColor: 'bg-purple-400',
    headerBg: 'bg-purple-950/20',
  },
  {
    id: 'replied',
    title: '5. Respondeu',
    shortTitle: 'Respondeu',
    description: 'Lead engajou com a abordagem',
    badgeColor: 'bg-teal-400',
    headerBg: 'bg-teal-950/20',
  },
  {
    id: 'qualifying',
    title: '6. Em Qualificação SPIN',
    shortTitle: 'Qualificação',
    description: 'SdrAgent conduzindo Situação, Dor & Implicação',
    badgeColor: 'bg-emerald-400',
    headerBg: 'bg-emerald-950/20',
  },
  {
    id: 'waiting_human_closer',
    title: '7. Aguardando Você Fechar',
    shortTitle: 'Handoff Gabriel',
    description: '🚨 Trava Humana ativa: proposta / agenda call',
    badgeColor: 'bg-amber-400',
    headerBg: 'bg-amber-950/30',
  },
  {
    id: 'proposal_sent',
    title: '8. Proposta Enviada',
    shortTitle: 'Proposta',
    description: 'Orçamento comercial em negociação direta',
    badgeColor: 'bg-orange-400',
    headerBg: 'bg-orange-950/20',
  },
  {
    id: 'project_approved',
    title: '9. Vendido / Concluído',
    shortTitle: 'Vendido',
    description: '🚀 GATILHO DIRETO: Dispara ArchitectAgent',
    badgeColor: 'bg-cyan-300',
    headerBg: 'bg-cyan-950/40',
  },
  {
    id: 'in_development',
    title: '10. Produzindo Sistema',
    shortTitle: 'Fábrica IA',
    description: 'ArchitectAgent codando telas e banco',
    badgeColor: 'bg-violet-400',
    headerBg: 'bg-violet-950/30',
  },
  {
    id: 'delivered',
    title: '11. Sistema Pronto / Entregue',
    shortTitle: 'Entregue',
    description: '✅ Software construído em projects/<slug>',
    badgeColor: 'bg-emerald-400',
    headerBg: 'bg-emerald-950/30',
  },
  {
    id: 'closed_lost',
    title: '12. Perdido / Encerrado',
    shortTitle: 'Encerrado',
    description: 'Opt-out ou sem fit no momento',
    badgeColor: 'bg-slate-500',
    headerBg: 'bg-slate-900/40',
  },
];

interface KanbanBoardProps {
  leads: LeadCardData[];
  buildLogs: any[];
  onRefreshLeads: () => void;
}

export function KanbanBoard({ leads, buildLogs, onRefreshLeads }: KanbanBoardProps) {
  const [activeDragLead, setActiveDragLead] = useState<LeadCardData | null>(null);
  const [handoverModalLead, setHandoverModalLead] = useState<LeadCardData | null>(null);
  const [inspectorLead, setInspectorLead] = useState<LeadCardData | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'whatsapp' | 'audit' | 'factory'>('whatsapp');

  // Sensors for smooth dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as LeadCardData | undefined;
    if (lead) {
      setActiveDragLead(lead);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragLead(null);

    if (!over) return;

    const leadId = String(active.id);
    const targetColumnId = String(over.id);

    // If dropped on the same status, no change
    const draggedLead = leads.find((l) => l.id === leadId);
    if (!draggedLead || draggedLead.lead_status === targetColumnId) return;

    // CRITICAL TRIGGER: Dropping on project_approved ("Vendido / Concluído")
    // Opens the DealHandoverSpec modal instantly for 1-click confirmation & dispatch!
    if (targetColumnId === 'project_approved') {
      setHandoverModalLead(draggedLead);
      return;
    }

    // Otherwise, execute direct transition
    try {
      await fetch(`/api/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetColumnId }),
      });
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmHandover = async (spec: any) => {
    try {
      await fetch(`/api/leads/${spec.leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'project_approved',
          handoverSpec: spec,
        }),
      });
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenInspector = (lead: LeadCardData, initialTab: 'whatsapp' | 'audit' | 'factory' = 'whatsapp') => {
    setInspectorLead(lead);
    setInspectorTab(initialTab);
  };

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-[#080c14] min-h-[calc(100vh-140px)]">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 items-start pb-8">
          {KANBAN_COLUMNS.map((col) => {
            const columnLeads = leads.filter((l) => l.lead_status === col.id);
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                leads={columnLeads}
                onOpenInspector={handleOpenInspector}
                buildLogs={buildLogs}
              />
            );
          })}
        </div>

        {/* Drag Overlay for ghost card during drag */}
        <DragOverlay>
          {activeDragLead ? (
            <div className="w-80 rotate-2 scale-105 shadow-2xl">
              <KanbanCard
                lead={activeDragLead}
                onOpenInspector={() => {}}
                buildLogs={buildLogs}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Handover Spec Modal on dragging to project_approved */}
      <DealHandoverModal
        lead={handoverModalLead}
        isOpen={Boolean(handoverModalLead)}
        onClose={() => setHandoverModalLead(null)}
        onConfirm={handleConfirmHandover}
      />

      {/* Side Inspector Drawer */}
      <LeadInspectorDrawer
        lead={inspectorLead}
        isOpen={Boolean(inspectorLead)}
        onClose={() => setInspectorLead(null)}
        onRefreshLeads={onRefreshLeads}
        initialTab={inspectorTab}
      />
    </div>
  );
}
