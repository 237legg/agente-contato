'use client';

import React, { useState } from 'react';
import { LeadCardData } from './KanbanCard';
import { 
  Sparkles, 
  Code2, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  FileText, 
  X, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface DealHandoverModalProps {
  lead: LeadCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (spec: {
    leadId: string;
    projectSlug: string;
    clientTradeName: string;
    niche: string;
    agreedSetupPrice: number;
    agreedMonthlyPrice: number;
    requestedFeatures: string[];
    specialInstructions: string;
  }) => Promise<void>;
}

export function DealHandoverModal({ lead, isOpen, onClose, onConfirm }: DealHandoverModalProps) {
  if (!isOpen || !lead) return null;

  const defaultSlug = (lead.trade_name || lead.company_name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const defaultFeatures = [
    'Centralização WhatsApp em Kanban CRM Multiatendente',
    'Automação de Lembretes de Confirmação Anti-No-Show',
    'Dashboard Executivo de BI em Tempo Real (Faturamento & Ticket Médio)',
    'Integração com Google Calendar para Agendamento Direto',
  ];

  const [projectSlug, setProjectSlug] = useState(defaultSlug);
  const [clientTradeName, setClientTradeName] = useState(lead.trade_name || lead.company_name);
  const [niche, setNiche] = useState(lead.segment || 'clinica');
  const [setupPrice, setSetupPrice] = useState(3800);
  const [monthlyPrice, setMonthlyPrice] = useState(650);
  const [features, setFeatures] = useState<string[]>(defaultFeatures);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [instructions, setInstructions] = useState(
    'Manter o número atual de WhatsApp da empresa sem necessidade de portabilidade. Priorizar visualização mobile rápida do painel de BI.'
  );
  const [loading, setLoading] = useState(false);

  const handleToggleFeature = (feat: string) => {
    if (features.includes(feat)) {
      setFeatures(features.filter((f) => f !== feat));
    } else {
      setFeatures([...features, feat]);
    }
  };

  const handleAddFeature = () => {
    if (newFeatureText.trim()) {
      setFeatures([...features, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({
        leadId: lead.id,
        projectSlug,
        clientTradeName,
        niche,
        agreedSetupPrice: Number(setupPrice),
        agreedMonthlyPrice: Number(monthlyPrice),
        requestedFeatures: features,
        specialInstructions: instructions,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0c1222] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Briefing de Produção — DealHandoverSpec
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Funil B Autônomo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Venda fechada para <span className="text-white font-medium">{lead.company_name}</span>. Confirme as instruções para o ArchitectAgent iniciar a produção do software.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome Fantasia / Exibição</label>
              <input
                type="text"
                value={clientTradeName}
                onChange={(e) => setClientTradeName(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Slug do Workspace (projects/&lt;slug&gt;)</label>
              <input
                type="text"
                value={projectSlug}
                onChange={(e) => setProjectSlug(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nicho de Mercado</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="clinica">Clínica Médica / Odonto</option>
                <option value="restaurante">Restaurante / Delivery</option>
                <option value="comercio">Comércio & Serviços</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Setup Acordado (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                <input
                  type="number"
                  value={setupPrice}
                  onChange={(e) => setSetupPrice(Number(e.target.value))}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 pl-9 text-white font-semibold focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Mensalidade Retainer (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">R$</span>
                <input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 pl-9 text-white font-semibold focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Requested Modules */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Módulos de CRM & BI a Construir:</span>
              <span className="text-slate-400 text-[11px]">Selecione os módulos incluídos</span>
            </label>
            <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              {features.map((feat) => (
                <div
                  key={feat}
                  onClick={() => handleToggleFeature(feat)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer text-slate-200 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs">{feat}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  placeholder="Adicionar módulo customizado..."
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Instruções Especiais de Fechamento (conversa do WhatsApp / briefing do cliente)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-white leading-relaxed focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          {/* Footer note */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-[11px] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              Ao confirmar, o <strong>ArchitectAgent</strong> criará a pasta <code className="font-mono bg-cyan-900/50 px-1 py-0.5 rounded text-cyan-100">projects/{projectSlug}/</code>, gerará o <strong>PRD.md</strong>, <strong>CLAUDE.md</strong>, banco SQLite e os códigos de CRM & BI em loop autônomo.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Code2 className="w-4 h-4 animate-spin" />
                  <span>Disparando ArchitectAgent...</span>
                </>
              ) : (
                <>
                  <Code2 className="w-4 h-4" />
                  <span>Confirmar e Iniciar Produção</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
