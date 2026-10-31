'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard, LeadCardData } from './KanbanCard';

export interface ColumnDefinition {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  badgeColor: string;
  headerBg: string;
}

interface KanbanColumnProps {
  column: ColumnDefinition;
  leads: LeadCardData[];
  onOpenInspector: (lead: LeadCardData, initialTab?: 'whatsapp' | 'audit' | 'factory') => void;
  buildLogs?: any[];
}

export function KanbanColumn({ column, leads, onOpenInspector, buildLogs = [] }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const leadIds = leads.map((l) => l.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 shrink-0 rounded-2xl glass-panel border transition-all duration-200 ${
        isOver
          ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
          : 'border-slate-800/90'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3 rounded-t-2xl border-b border-slate-800/80 ${column.headerBg}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${column.badgeColor}`} />
            <h3 className="font-semibold text-xs text-slate-100 tracking-wide uppercase">
              {column.title}
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60">
            {leads.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{column.description}</p>
      </div>

      {/* Cards Scrollable Container */}
      <div className="p-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-250px)] space-y-2.5 min-h-[140px]">
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onOpenInspector={onOpenInspector}
              buildLogs={buildLogs}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-xl text-center p-3 text-slate-500 text-xs">
            <span>Nenhum card nesta etapa</span>
            <span className="text-[10px] text-slate-600 mt-0.5">Arraste um card para cá</span>
          </div>
        )}
      </div>
    </div>
  );
}
