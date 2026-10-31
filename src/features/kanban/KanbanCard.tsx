'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Building2, 
  User, 
  MapPin, 
  Lock, 
  Bot, 
  Calendar, 
  TrendingDown, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Code2, 
  ChevronRight,
  MessageSquare
} from 'lucide-react';

export interface LeadCardData {
  id: string;
  company_name: string;
  trade_name?: string;
  decision_maker_name?: string;
  segment: string;
  city: string;
  phone: string;
  icp_score: number;
  lead_status: string;
  channel_state: string;
  active_agent?: string | null;
  active_agent_status?: string | null;
  primary_bottleneck?: string | null;
  estimated_monthly_loss?: number | null;
  scheduled_calendar_time?: string | null;
  google_meet_url?: string | null;
}

interface KanbanCardProps {
  lead: LeadCardData;
  onOpenInspector: (lead: LeadCardData, initialTab?: 'whatsapp' | 'audit' | 'factory') => void;
  buildLogs?: any[];
}

export function KanbanCard({ lead, onOpenInspector, buildLogs = [] }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getNicheBadge = (segment: string) => {
    switch (segment) {
      case 'clinica':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Clínica</span>;
      case 'restaurante':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Restaurante</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Comércio</span>;
    }
  };

  // Find latest build log for progress calculation if in development or delivered
  const relevantLogs = buildLogs.filter((l) => l.lead_id === lead.id);
  const latestLog = relevantLogs[relevantLogs.length - 1];
  const progressPercent = latestLog?.progress_percent || (lead.lead_status === 'delivered' ? 100 : lead.lead_status === 'in_development' ? 50 : 0);

  const isChannelLocked = lead.channel_state === 'human_locked';
  const isDoNotContact = lead.channel_state === 'do_not_contact';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpenInspector(lead)}
      className={`group relative glass-card p-3.5 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 border text-xs select-none ${
        isDragging ? 'shadow-2xl ring-2 ring-cyan-500' : ''
      } ${
        lead.lead_status === 'waiting_human_closer'
          ? 'border-amber-500/50 bg-amber-950/20 shadow-amber-500/5'
          : lead.lead_status === 'in_development'
          ? 'border-indigo-500/50 bg-indigo-950/20'
          : lead.lead_status === 'delivered'
          ? 'border-emerald-500/50 bg-emerald-950/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header: Niche & Channel state */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {getNicheBadge(lead.segment)}
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
            ICP {lead.icp_score}
          </span>
        </div>

        <div>
          {isChannelLocked ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <Lock className="w-2.5 h-2.5 text-rose-400" />
              Trava Humana
            </span>
          ) : isDoNotContact ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
              Bloqueado (DNC)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Bot className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
              IA Ativa
            </span>
          )}
        </div>
      </div>

      {/* Company & Decision maker */}
      <div className="mb-2">
        <h4 className="font-semibold text-slate-100 text-sm truncate flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{lead.trade_name || lead.company_name}</span>
        </h4>
        <div className="flex items-center gap-2 mt-1 text-slate-400 text-[11px]">
          {lead.decision_maker_name && (
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{lead.decision_maker_name}</span>
            </span>
          )}
          <span className="flex items-center gap-1 shrink-0 text-slate-500">
            <MapPin className="w-3 h-3 text-slate-600" />
            {lead.city.split('-')[0].trim()}
          </span>
        </div>
      </div>

      {/* CRM/BI Bottleneck or Estimated loss */}
      {lead.primary_bottleneck && (
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 mb-2">
          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            <span className="text-amber-400/90 font-medium">Gargalo: </span>
            {lead.primary_bottleneck}
          </p>
          {lead.estimated_monthly_loss && lead.estimated_monthly_loss > 0 && (
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-rose-400">
                <TrendingDown className="w-3 h-3" />
                Perda estimada:
              </span>
              <span className="font-semibold text-slate-200">
                R$ {lead.estimated_monthly_loss.toLocaleString('pt-BR')}/mês
              </span>
            </div>
          )}
        </div>
      )}

      {/* Google Calendar scheduled time */}
      {lead.scheduled_calendar_time && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] mb-2 font-medium">
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            Reunião: {new Date(lead.scheduled_calendar_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      )}

      {/* Active agent animated badge */}
      {lead.active_agent && (
        <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 p-1.5 rounded-md mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="truncate font-mono">{lead.active_agent_status || `${lead.active_agent} em execução...`}</span>
        </div>
      )}

      {/* Software Factory Progress Bar (if in_development or project_approved or delivered) */}
      {(lead.lead_status === 'project_approved' || lead.lead_status === 'in_development' || lead.lead_status === 'delivered') && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
            <span className="flex items-center gap-1 text-indigo-400 font-medium">
              <Code2 className="w-3 h-3" />
              {lead.lead_status === 'delivered' ? 'Software Entregue' : 'Fábrica Autônoma'}
            </span>
            <span className="font-mono font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                lead.lead_status === 'delivered'
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 animate-pulse'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {latestLog?.message && (
            <p className="text-[10px] text-slate-400 mt-1 truncate font-mono">
              {latestLog.message}
            </p>
          )}
        </div>
      )}

      {/* Bottom quick action bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInspector(lead, 'whatsapp');
          }}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          <span>Ver Chat</span>
        </button>

        <span className="flex items-center gap-0.5 text-slate-500 group-hover:text-slate-300 transition-colors">
          <span>Detalhes</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
