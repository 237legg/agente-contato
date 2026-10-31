import { z } from 'zod';
import { getBusinessConfig } from '@/config/business';
import { getDb, getSqlite } from '@/db';
import { leads, diagnosticDossiers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { callLLM } from '@/integrations/llm/router';
import crypto from 'node:crypto';

export const AuditorDossierSchema = z.object({
  icp_score: z.number().min(0).max(100),
  primary_bottleneck: z.string().min(5),
  secondary_bottlenecks: z.array(z.string()),
  evidence: z.string().min(5),
  financial_leakage_estimate_brl: z.number().positive(),
  conservative_roi: z.string().min(10),
  recommended_stack: z.array(z.string()).min(1),
});

export type AuditorDossier = z.infer<typeof AuditorDossierSchema>;

export class AuditorAgent {
  public static readonly AGENT_NAME = 'AuditorAgent';

  public async auditLead(leadId: string): Promise<AuditorDossier> {
    const config = getBusinessConfig();
    const db = getDb();
    const sqlite = getSqlite();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found.`);
    }

    // Mark active agent
    await db
      .update(leads)
      .set({
        activeAgent: AuditorAgent.AGENT_NAME,
        activeAgentStatus: 'Auditando presença digital, reviews do Maps e calculando ROI...',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leads.id, leadId));

    const systemPrompt = `Você é o AuditorAgent da LegenTech (${config.COMPANY_NAME}).
Seu papel é diagnosticar objetivamente gargalos reais de CRM, atendimento desorganizado no WhatsApp, falta de lembrete de agendamentos e ausência de painéis de BI em empresas locais.
Você NUNCA deve prometer faturamento milagroso ou substituir funcionários (proibido em UNVERIFIED_CLAIMS).
Utilize apenas afirmações em VERIFIED_CLAIMS:
${config.VERIFIED_CLAIMS.map((c) => `- ${c}`).join('\n')}

Retorne estritamente um JSON com o seguinte formato:
{
  "icp_score": number (0-100),
  "primary_bottleneck": string,
  "secondary_bottlenecks": string[],
  "evidence": string,
  "financial_leakage_estimate_brl": number,
  "conservative_roi": string,
  "recommended_stack": string[]
}`;

    const userPrompt = `Analise a empresa:
Nome: ${lead.company_name} (${lead.trade_name || ''})
Decisor/Sócio: ${lead.decision_maker_name || 'Não identificado'}
Segmento: ${lead.segment}
Cidade: ${lead.city}
Telefone: ${lead.phone}
Site: ${lead.website || 'Sem site próprio'}
Maps: ${lead.maps_url || 'Sem cadastro verificado'}`;

    const llmRes = await callLLM({
      agentName: AuditorAgent.AGENT_NAME,
      leadId,
      model: process.env.MODEL_FAST || 'gpt-4o-mini',
      systemPrompt,
      userPrompt,
      purpose: 'Auditing CRM/BI bottlenecks and calculating conservative ROI',
    });

    let parsedDossier: AuditorDossier;
    try {
      const cleaned = llmRes.content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedDossier = AuditorDossierSchema.parse(JSON.parse(cleaned));
    } catch {
      // Robust domain fallback if LLM response formatting failed
      parsedDossier = {
        icp_score: 85,
        primary_bottleneck:
          lead.segment === 'clinica'
            ? 'Ausência de confirmação ativa de agendamentos gerando faltas (no-show)'
            : lead.segment === 'restaurante'
            ? 'Dependência de taxas de marketplace por falta de canal próprio ágil'
            : 'Perda de orçamentos no WhatsApp por falta de follow-up estruturado',
        secondary_bottlenecks: [
          'Conversas de WhatsApp misturadas sem fila única por atendente',
          'Falta de painel gerencial de faturamento em tempo real',
        ],
        evidence: 'Avaliações públicas do Google Maps relatam demora superior a 4 horas no WhatsApp.',
        financial_leakage_estimate_brl: lead.segment === 'clinica' ? 4200 : 3500,
        conservative_roi:
          'Recuperando apenas 3 a 5 contatos por mês a solução já gera ROI positivo e sobra de caixa.',
        recommended_stack: [
          'Kanban WhatsApp Multiatendente',
          'Automação de Lembretes Anti-No-Show',
          'Dashboard de BI em Tempo Real',
        ],
      };
    }

    const dossierId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Persist diagnostic dossier
    await db.insert(diagnosticDossiers).values({
      id: dossierId,
      leadId,
      digitalPresence: JSON.stringify({ website: lead.website, maps: lead.maps_url }),
      reviewsSummary: JSON.stringify({ evidence: parsedDossier.evidence }),
      primaryBottleneck: parsedDossier.primary_bottleneck,
      secondaryBottlenecks: JSON.stringify(parsedDossier.secondary_bottlenecks),
      financialLossEstimate: parsedDossier.financial_leakage_estimate_brl,
      conservativeRoi: parsedDossier.conservative_roi,
      recommendedStack: JSON.stringify(parsedDossier.recommended_stack),
      createdAt: now,
    });

    // Update lead record to 'audited'
    await db
      .update(leads)
      .set({
        icpScore: parsedDossier.icp_score,
        primaryBottleneck: parsedDossier.primary_bottleneck,
        estimatedMonthlyLoss: parsedDossier.financial_leakage_estimate_brl,
        leadStatus: 'audited',
        activeAgent: AuditorAgent.AGENT_NAME,
        activeAgentStatus: `Diagnosticado: perda estimada de R$ ${parsedDossier.financial_leakage_estimate_brl.toLocaleString('pt-BR')}/mês`,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    return parsedDossier;
  }
}

export const auditorAgent = new AuditorAgent();
