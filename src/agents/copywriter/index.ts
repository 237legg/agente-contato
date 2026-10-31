import { z } from 'zod';
import { getBusinessConfig } from '@/config/business';
import { getDb, getSqlite } from '@/db';
import { leads, outreachDrafts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { callLLM } from '@/integrations/llm/router';
import { criticAgent, CriticEvaluation } from '@/agents/critic';
import crypto from 'node:crypto';

export const CopywriterOutputSchema = z.object({
  leadId: z.string(),
  bubbles: z.tuple([z.string(), z.string(), z.string()]),
  wordCount: z.number(),
  iterations: z.number(),
  criticScore: z.number(),
  approved: z.boolean(),
});

export type CopywriterOutput = z.infer<typeof CopywriterOutputSchema>;

export class CopywriterAgent {
  public static readonly AGENT_NAME = 'CopywriterAgent';

  public async generateOutreach(leadId: string): Promise<CopywriterOutput> {
    const config = getBusinessConfig();
    const db = getDb();
    const sqlite = getSqlite();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found.`);
    }

    const dossier = sqlite
      .prepare('SELECT * FROM diagnostic_dossiers WHERE lead_id = ? ORDER BY created_at DESC')
      .get(leadId) as any;

    // Update lead status to drafting
    await db
      .update(leads)
      .set({
        leadStatus: 'drafting_copy',
        activeAgent: CopywriterAgent.AGENT_NAME,
        activeAgentStatus: 'Criando abordagem em 3 balões com validação do CriticAgent...',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leads.id, leadId));

    let bubbles: [string, string, string] = ['', '', ''];
    let evaluation: CriticEvaluation = {
      approved: false,
      score: 0,
      wordCount: 0,
      feedback: '',
    };
    let iteration = 0;
    const maxIterations = 3;

    while (iteration < maxIterations && !evaluation.approved) {
      iteration++;

      const systemPrompt = `Você é o CopywriterAgent da LegenTech (${config.COMPANY_NAME}).
Seu objetivo é redigir exatamente 3 BALÕES CURTOS de WhatsApp para o decisor da empresa.
REGRAS RÍGIDAS:
1. TOTAL MÁXIMO DE 50 PALAVRAS somando os 3 balões.
2. Balão 1: Quebra de gelo pessoal citando o nome do decisor e a cidade/operação local.
3. Balão 2: Gargalo identificado (${dossier?.primary_bottleneck || lead.primary_bottleneck}) + solução LegenTech (Kanban WhatsApp ou Dashboard BI em tempo real).
4. Balão 3: Pergunta aberta de baixo atrito sobre como controlam hoje (planilha/no braço vs sistema).
5. PROIBIDO: "Espero que esteja bem", "Revolucionar", "Alavancar", "Sinergia", promessas irreais.

${evaluation.rejectionReason ? `ATENÇÃO: A tentativa anterior foi REPROVADA pelo CriticAgent pelo motivo: "${evaluation.rejectionReason}". Corrija imediatamente!` : ''}

Retorne estritamente um JSON:
{
  "bubble_1": "texto do balão 1",
  "bubble_2": "texto do balão 2",
  "bubble_3": "texto do balão 3"
}`;

      const userPrompt = `Empresa: ${lead.company_name}
Decisor: ${lead.decision_maker_name || 'Gestor'}
Cidade: ${lead.city}
Gargalo: ${dossier?.primary_bottleneck || 'Perda de atendimentos e falta de controle de vendas'}
Perda estimada: R$ ${dossier?.financial_loss_estimate || 3500}/mês`;

      const llmRes = await callLLM({
        agentName: CopywriterAgent.AGENT_NAME,
        leadId,
        model: process.env.MODEL_SMART || 'gpt-4o',
        systemPrompt,
        userPrompt,
        purpose: `Generating 3-bubble outreach (iteration ${iteration})`,
      });

      try {
        const cleaned = llmRes.content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        bubbles = [parsed.bubble_1.trim(), parsed.bubble_2.trim(), parsed.bubble_3.trim()];
      } catch {
        // High quality deterministic fallback
        const name = lead.decision_maker_name || 'Olá';
        bubbles = [
          `${name}, tudo bem? Vi o atendimento de vocês aqui em ${lead.city}.`,
          `Muitas empresas da região perdem vendas no WhatsApp sem follow-up. Nós implantamos CRM integrado e painel de BI em tempo real.`,
          `Vocês controlam esse atendimento em planilha ou já usam sistema próprio?`,
        ];
      }

      evaluation = criticAgent.evaluateDraft(bubbles);

      // Save draft attempt
      await db.insert(outreachDrafts).values({
        id: crypto.randomUUID(),
        leadId,
        iteration,
        bubble1: bubbles[0],
        bubble2: bubbles[1],
        bubble3: bubbles[2],
        wordCount: evaluation.wordCount,
        criticApproved: evaluation.approved ? 1 : 0,
        criticRejectionReason: evaluation.rejectionReason || null,
        createdAt: new Date().toISOString(),
      });
    }

    // If still not approved after max iterations, enforce strict condensed fallback
    if (!evaluation.approved) {
      const name = lead.decision_maker_name || 'Olá';
      bubbles = [
        `${name}, vi a movimentação de vocês em ${lead.city}.`,
        `Estruturamos CRM no WhatsApp e painel financeiro sob medida para evitar perda de clientes.`,
        `Como vocês controlam esses contatos hoje?`,
      ];
      evaluation = criticAgent.evaluateDraft(bubbles);
    }

    return CopywriterOutputSchema.parse({
      leadId,
      bubbles,
      wordCount: evaluation.wordCount,
      iterations: iteration,
      criticScore: evaluation.score,
      approved: evaluation.approved,
    });
  }
}

export const copywriterAgent = new CopywriterAgent();
