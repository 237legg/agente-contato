'use client';

import React, { useState, useEffect } from 'react';
import { LeadCardData } from '../kanban/KanbanCard';
import { 
  X, 
  MessageSquare, 
  FileSearch, 
  Code2, 
  Send, 
  Mic, 
  Lock, 
  Unlock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  Building2, 
  User, 
  Phone, 
  ExternalLink,
  RefreshCw,
  Sparkles,
  Play,
  Layers,
  FolderTree
} from 'lucide-react';

interface LeadInspectorDrawerProps {
  lead: LeadCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onRefreshLeads: () => void;
  initialTab?: 'whatsapp' | 'audit' | 'factory';
}

export function LeadInspectorDrawer({
  lead,
  isOpen,
  onClose,
  onRefreshLeads,
  initialTab = 'whatsapp',
}: LeadInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'audit' | 'factory'>(initialTab);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any | null>(null);
  const [handoverSpec, setHandoverSpec] = useState<any | null>(null);
  const [buildLogs, setBuildLogs] = useState<any[]>([]);
  const [outreachDrafts, setOutreachDrafts] = useState<any[]>([]);

  // Simulation message input
  const [inputText, setInputText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadDetails = async () => {
    if (!lead) return;
    try {
      // 1. Fetch messages
      const msgRes = await fetch(`/api/leads/${lead.id}/messages`);
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        setMessagesList(msgs);
      }

      // 2. Fetch full leads data to get dossier, build logs and handover specs
      const fullRes = await fetch(`/api/leads`);
      if (fullRes.ok) {
        const data = await fullRes.json();
        const foundDossier = (data.dossiers || []).find((d: any) => d.lead_id === lead.id);
        const foundHandover = (data.handoverSpecs || []).find((h: any) => h.lead_id === lead.id);
        const foundLogs = (data.buildLogs || []).filter((l: any) => l.lead_id === lead.id);
        const foundDrafts = (data.drafts || []).filter((d: any) => d.lead_id === lead.id);

        setDossier(foundDossier || null);
        setHandoverSpec(foundHandover || null);
        setBuildLogs(foundLogs);
        setOutreachDrafts(foundDrafts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen && lead) {
      loadDetails();
      const interval = setInterval(loadDetails, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  // Actions
  const handleToggleChannelLock = async () => {
    setActionLoading(true);
    try {
      const nextState = lead.channel_state === 'human_locked' ? 'ai_active' : 'human_locked';
      await fetch(`/api/leads/${lead.id}/channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelState: nextState }),
      });
      await onRefreshLeads();
      await loadDetails();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (sender: 'human_operator' | 'lead', isAudio = false) => {
    if (!inputText.trim()) return;
    setActionLoading(true);
    const content = inputText.trim();
    setInputText('');

    try {
      await fetch(`/api/leads/${lead.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, sender, isAudio }),
      });
      await loadDetails();
      await onRefreshLeads();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateAudio = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/leads/${lead.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Olá! Ouvi dizer que vocês implantam CRM e painéis de BI. Quanto custa e como funciona a implantação?',
          sender: 'lead',
          isAudio: true,
        }),
      });
      await loadDetails();
      await onRefreshLeads();
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleMeeting = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/leads/${lead.id}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: scheduledTime || undefined }),
      });
      setScheduleModalOpen(false);
      await loadDetails();
      await onRefreshLeads();
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerRebuild = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/leads/${lead.id}/build`, { method: 'POST' });
      await loadDetails();
      await onRefreshLeads();
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerReaudit = async () => {
    setActionLoading(true);
    try {
      await fetch(`/api/leads/${lead.id}/audit`, { method: 'POST' });
      await loadDetails();
      await onRefreshLeads();
    } finally {
      setActionLoading(false);
    }
  };

  const isChannelLocked = lead.channel_state === 'human_locked';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#090e1a] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">{lead.trade_name || lead.company_name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {lead.segment}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                {lead.decision_maker_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {lead.decision_maker_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {lead.phone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleChannelLock}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isChannelLocked
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
              }`}
            >
              {isChannelLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Trava Humana Ativa</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>IA Ativa (Travar)</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-4">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp & SDR</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {messagesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>Dossiê de Auditoria</span>
            {dossier && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('factory')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'factory'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Fábrica de Software</span>
            {buildLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-900/80 text-indigo-300 font-mono">
                {buildLogs[buildLogs.length - 1]?.progress_percent}%
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          {/* TAB 1: WHATSAPP & SDR */}
          {activeTab === 'whatsapp' && (
            <div className="flex flex-col h-full space-y-3">
              {/* Status Alert Banner */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Canal:</span>
                    {isChannelLocked ? (
                      <span className="text-rose-400 font-medium">Travado em Humano (IA não responde)</span>
                    ) : (
                      <span className="text-cyan-400 font-medium">IA Ativa (SDR responde com debounce de 7s)</span>
                    )}
                  </div>
                  {lead.scheduled_calendar_time && (
                    <p className="text-[11px] text-amber-300 mt-1">
                      📅 Reunião Google Calendar: {new Date(lead.scheduled_calendar_time).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Agendar Call</span>
                </button>
              </div>

              {/* Message Timeline */}
              <div className="flex-1 bg-slate-950/80 rounded-xl border border-slate-800/80 p-3 overflow-y-auto space-y-3 min-h-[280px]">
                {messagesList.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-center">
                    <MessageSquare className="w-8 h-8 text-slate-700 mb-1" />
                    <span>Nenhuma mensagem nesta conversa ainda.</span>
                    <span className="text-[11px] text-slate-600 mt-0.5">
                      Envie uma abordagem ou use o simulador abaixo.
                    </span>
                  </div>
                ) : (
                  messagesList.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    const isAudio = msg.media_type === 'audio';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-md ${
                            isOutbound
                              ? msg.sender === 'human_operator'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-cyan-600/90 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] opacity-75 mb-1 font-semibold uppercase tracking-wider">
                            <span>
                              {msg.sender === 'human_operator'
                                ? 'Operador (Gabriel Valença)'
                                : msg.sender === 'ai_sdr'
                                ? 'LegenTech SDR (IA)'
                                : 'Cliente'}
                            </span>
                            {isAudio && (
                              <span className="flex items-center gap-0.5 bg-black/30 px-1 py-0.2 rounded text-[9px]">
                                <Mic className="w-2.5 h-2.5" /> Áudio
                              </span>
                            )}
                          </div>
                          <p className="text-xs whitespace-pre-line">{msg.content}</p>
                          <div className="text-[10px] text-right mt-1 opacity-60">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Simulation / Interactive Sending Box */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Digite a mensagem para enviar ou simular resposta..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage('human_operator');
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <button
                    onClick={() => handleSendMessage('human_operator')}
                    disabled={actionLoading || !inputText.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    title="Envia como Operador Humano (pausa a IA)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Humano</span>
                  </button>
                </div>

                {/* Simulator Buttons Row */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-mono">Simulador Local:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('lead')}
                      disabled={actionLoading || !inputText.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium border border-cyan-500/20 disabled:opacity-50"
                    >
                      Simular Cliente (Texto)
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulateAudio}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/30 disabled:opacity-50"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Simular Áudio de Dúvida</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT DOSSIER */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-200">Dossiê Técnico e Comercial de BI/CRM</h4>
                  <p className="text-[11px] text-slate-400">Gerado pelo AuditorAgent com cruzamento de sinais públicos</p>
                </div>
                <button
                  onClick={handleTriggerReaudit}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Re-executar Auditoria</span>
                </button>
              </div>

              {dossier ? (
                <div className="space-y-3">
                  {/* Financial Loss Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900 border border-rose-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400 font-semibold flex items-center gap-1.5 text-xs">
                        <TrendingDown className="w-4 h-4" />
                        Perda Financeira Estimada
                      </span>
                      <span className="text-base font-bold text-rose-300">
                        R$ {Number(dossier.financial_loss_estimate).toLocaleString('pt-BR')}/mês
                      </span>
                    </div>
                    <p className="text-slate-300 mt-2 text-xs leading-relaxed">
                      <strong>Gargalo Primário:</strong> {dossier.primary_bottleneck}
                    </p>
                    <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
                      <strong>ROI Conservador:</strong> {dossier.conservative_roi}
                    </p>
                  </div>

                  {/* Evidence Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <h5 className="font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                      <FileSearch className="w-3.5 h-3.5 text-slate-400" />
                      Evidências Públicas Coletadas:
                    </h5>
                    <p className="text-slate-400 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed text-[11px]">
                      {dossier.reviews_summary
                        ? JSON.parse(dossier.reviews_summary)?.evidence || dossier.reviews_summary
                        : 'Sinais de atendimento manual e lentidão coletados nas avaliações do Maps.'}
                    </p>
                  </div>

                  {/* Recommended Stack */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <h5 className="font-medium text-slate-300 mb-2">Módulos Recomendados pela LegenTech:</h5>
                    <div className="space-y-1.5">
                      {JSON.parse(dossier.recommended_stack || '[]').map((st: string) => (
                        <div key={st} className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outreach Drafts & Critic Loop */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <h5 className="font-medium text-slate-300 mb-2 flex items-center justify-between">
                      <span>Abordagens Geradas & Validação do CriticAgent:</span>
                      <span className="text-[10px] text-slate-400 font-mono">Loop de 3 Balões</span>
                    </h5>
                    {outreachDrafts.length === 0 ? (
                      <p className="text-slate-500 text-[11px]">Nenhum rascunho arquivado ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {outreachDrafts.map((d: any) => (
                          <div key={d.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">Iteração {d.iteration} ({d.word_count} palavras)</span>
                              {d.critic_approved ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                                  Aprovado pelo CriticAgent
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium">
                                  Reprovado: {d.critic_rejection_reason}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-0.5 pt-1">
                              <p className="border-l-2 border-cyan-500/50 pl-2">1: {d.bubble_1}</p>
                              <p className="border-l-2 border-cyan-500/50 pl-2">2: {d.bubble_2}</p>
                              <p className="border-l-2 border-cyan-500/50 pl-2">3: {d.bubble_3}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <span>Dossiê ainda não gerado para este lead.</span>
                  <button
                    onClick={handleTriggerReaudit}
                    className="mt-3 block mx-auto px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-medium"
                  >
                    Gerar Auditoria Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOFTWARE FACTORY (ARCHITECT AGENT) */}
          {activeTab === 'factory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div>
                  <h4 className="font-semibold text-slate-200">Fábrica de Software — Output do ArchitectAgent</h4>
                  <p className="text-[11px] text-slate-400">
                    Geração e compilação em <code className="font-mono text-cyan-300">projects/{handoverSpec?.project_slug || lead.trade_name?.toLowerCase().replace(/\s+/g, '-')}</code>
                  </p>
                </div>
                <button
                  onClick={handleTriggerRebuild}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 text-xs font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Re-executar Build</span>
                </button>
              </div>

              {/* Progress Stepper */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Progresso do Sistema:</span>
                  <span className="text-cyan-400 font-mono">
                    {buildLogs[buildLogs.length - 1]?.progress_percent || (lead.lead_status === 'delivered' ? 100 : 0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                    style={{
                      width: `${buildLogs[buildLogs.length - 1]?.progress_percent || (lead.lead_status === 'delivered' ? 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Handover Spec Overview */}
              {handoverSpec && (
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-2">
                  <h5 className="font-semibold text-slate-200">Especificação Fechada (DealHandoverSpec):</h5>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Setup Acordado:</span>
                      <span className="text-emerald-400 font-semibold">
                        R$ {Number(handoverSpec.agreed_setup_price).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Mensalidade:</span>
                      <span className="text-cyan-400 font-semibold">
                        R$ {Number(handoverSpec.agreed_monthly_price).toLocaleString('pt-BR')}/mês
                      </span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-400 block text-[11px] mb-1">Módulos:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {JSON.parse(handoverSpec.requested_features || '[]').map((m: string) => (
                        <span key={m} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step Build Logs */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <h5 className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
                  <span>Logs de Execução da Fábrica:</span>
                  <span className="text-[10px] text-slate-400 font-mono">Code → Lint → Build → Test</span>
                </h5>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {buildLogs.length === 0 ? (
                    <p className="text-slate-500 py-2">Nenhum log gravado ainda. Arraste para 'Vendido / Concluído' para disparar.</p>
                  ) : (
                    buildLogs.map((log: any) => (
                      <div key={log.id} className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-300">{log.step_name} [{log.progress_percent}%]</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[10px] mt-0.5">{log.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Booking Quick Modal */}
        {scheduleModalOpen && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
            <div className="flex-1">
              <label className="block text-slate-300 font-medium mb-1">Escolha a data e hora da reunião no Google Calendar:</label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleScheduleMeeting}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400"
              >
                Confirmar Reunião
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
