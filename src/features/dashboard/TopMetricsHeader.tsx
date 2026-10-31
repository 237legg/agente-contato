'use client';

import React from 'react';
import { 
  Compass, 
  FileSearch, 
  Send, 
  MessageSquare, 
  Calendar, 
  Lock, 
  Code2, 
  DollarSign, 
  Sparkles, 
  AlertCircle, 
  Activity, 
  PowerOff, 
  Plus, 
  RefreshCw,
  Cpu
} from 'lucide-react';

interface TopMetricsHeaderProps {
  systemStatus: any;
  onDiscoverLeads: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function TopMetricsHeader({
  systemStatus,
  onDiscoverLeads,
  onRefresh,
  loading,
}: TopMetricsHeaderProps) {
  const metrics = systemStatus?.metrics || {};
  const poolStatus = systemStatus?.poolStatus || {};
  const config = systemStatus?.config || {};

  const replyRate = metrics.contacted > 0 
    ? Math.round(((metrics.replied + metrics.qualifying + metrics.waitingHuman) / metrics.contacted) * 100) 
    : 0;

  return (
    <header className="border-b border-slate-800 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Upper Brand & Action Bar */}
      <div className="px-6 py-3.5 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black text-xl">
            LT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 text-base tracking-tight">
                {config.companyName || 'LegenTech'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">
                Engenharia & Automação Comercial
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Diretor: <span className="text-slate-300 font-medium">{config.ownerName || 'Gabriel Valença'}</span> · CRM, BI & Software Sob Medida
            </p>
          </div>
        </div>

        {/* Pools Activity Badges & Actions */}
        <div className="flex items-center gap-3">
          {/* Multiplexer Concurrent Pools Badges */}
          <div className="hidden lg:flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
            <span className="text-slate-400 px-1.5 flex items-center gap-1 font-mono">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Pools:
            </span>

            <span className={`px-2 py-0.5 rounded font-mono ${
              poolStatus.discovery?.active 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              Discovery: {poolStatus.discovery?.active ? 'Executando' : 'Pronto'}
            </span>

            <span className={`px-2 py-0.5 rounded font-mono ${
              poolStatus.whatsappRealtime?.active 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              WhatsApp Realtime: {poolStatus.whatsappRealtime?.active ? 'Ativo' : 'Pronto'}
            </span>

            <span className={`px-2 py-0.5 rounded font-mono ${
              poolStatus.softwareFactory?.active 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              Architect Factory: {poolStatus.softwareFactory?.active ? 'Codando' : 'Pronto'}
            </span>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={onDiscoverLeads}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Minerar Empresas (Scout)</span>
          </button>
        </div>
      </div>

      {/* Lower Metrics Stats Grid */}
      <div className="px-6 py-2.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
        {/* Descobertos & Auditados */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              Descobertos
            </span>
            <span className="font-mono">{metrics.discovered || 0}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-slate-100">{metrics.totalLeads || 0}</span>
            <span className="text-[10px] text-cyan-400">{metrics.audited || 0} auditados</span>
          </div>
        </div>

        {/* Abordados & Taxa de Resposta */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3 text-indigo-400" />
              WhatsApp
            </span>
            <span className="font-mono">{metrics.contacted || 0} envios</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-slate-100">{replyRate}%</span>
            <span className="text-[10px] text-emerald-400">taxa resposta</span>
          </div>
        </div>

        {/* Reuniões Google Calendar */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              Calendar Calls
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-amber-300">
              {metrics.waitingHuman || 0}
            </span>
            <span className="text-[10px] text-amber-400/80">agendadas/closer</span>
          </div>
        </div>

        {/* Aguardando Handoff Gabriel */}
        <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
          <div className="flex items-center justify-between text-amber-300 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Trava Humana
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-amber-200">{metrics.waitingHuman || 0}</span>
            <span className="text-[10px] text-amber-300">fechar proposta</span>
          </div>
        </div>

        {/* Fábrica ArchitectAgent */}
        <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
          <div className="flex items-center justify-between text-indigo-300 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              Fábrica de Código
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-indigo-200">
              {(metrics.inDevelopment || 0) + (metrics.delivered || 0)}
            </span>
            <span className="text-[10px] text-emerald-400">{metrics.delivered || 0} entregues</span>
          </div>
        </div>

        {/* Receita Setup & Retainer */}
        <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Receita Fechada
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-bold text-emerald-200">
              R$ {Number(metrics.totalSetupSold || 0).toLocaleString('pt-BR')}
            </span>
            <span className="text-[10px] text-cyan-300 font-mono">
              +R${Number(metrics.totalMonthlySold || 0)}/m
            </span>
          </div>
        </div>

        {/* AI Budget Tracker */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Custo LLMs
            </span>
            <span className="font-mono text-[10px]">
              ${Number(metrics.totalAiCost || 0).toFixed(3)}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs font-semibold text-slate-200">
              Teto: ${metrics.budgetLimitUsd || 50}/m
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {poolStatus.budgetExceeded ? 'Estourado' : 'OK'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
