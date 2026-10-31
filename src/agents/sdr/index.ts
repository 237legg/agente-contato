import { z } from 'zod';
import { getBusinessConfig } from '@/config/business';
import { getDb, getSqlite } from '@/db';
import { leads, messages, doNotContact } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { callLLM } from '@/integrations/llm/router';
import { evolutionClient } from '@/integrations/evolution-whatsapp/client';
import { googleCalendarClient } from '@/integrations/google-calendar/client';
import crypto from 'node:crypto';

export const SdrIntentEnum = z.enum([
  'curious_about_solution',
  'shared_current_pain',
  'asked_how_it_works',
  'asked_pricing',
  'objection_already_have_system',
  'objection_too_small',
  'objection_no_time',
  'technical_critical_question',
  'ready_to_buy_or_meet',
  'not_the_owner',
  'not_interested',
  'opt_out',
]);

export type SdrIntent = z.infer<typeof SdrIntentEnum>;

export const SdrResponseSchema = z.object({
  intent: SdrIntentEnum,
  reply: z.string(),
  needsHumanCloser: z.boolean(),
  scheduledMeetingTime: z.string().optional(),
  calendarMeetUrl: z.string().optional(),
  summary: z.string(),
});

export type SdrResponse = z.infer<typeof SdrResponseSchema>;

export class SdrAgent {
  public static readonly AGENT_NAME = 'SdrAgent';

  public async processInboundMessage(leadId: string, incomingText: string): Promise<SdrResponse> {
    const config = getBusinessConfig();
    const db = getDb();
    const sqlite = getSqlite();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      throw new Error(`Lead with ID ${leadId} not found.`);
    }

    // 1. Guardrail: If channel is already HUMAN_LOCKED or DO_NOT_CONTACT, do NOT let AI answer!
    if (lead.channel_state === 'human_locked' || lead.channel_state === 'do_not_contact') {
      console.log(`[SdrAgent Skipped] Lead ${leadId} is ${lead.channel_state}. No AI response dispatched.`);
      return {
        intent: 'curious_about_solution',
        reply: '',
        needsHumanCloser: true,
        summary: `Canal travado em ${lead.channel_state}. Mensagem registrada no histórico para operador humano.`,
      };
    }

    // 2. Opt-out check (Immediate permanent unsubscribe)
    const normalizedInbound = incomingText.trim().toLowerCase();
    if (
      normalizedInbound === 'sair' ||
      normalizedInbound === 'parar' ||
      normalizedInbound.includes('não me mande mais') ||
      normalizedInbound.includes('remover meu número') ||
      normalizedInbound.includes('descadastrar')
    ) {
      // Add to do_not_contact
      await db
        .insert(doNotContact)
        .values({
          phone: lead.phone,
          reason: 'Lead requested opt_out via WhatsApp',
          createdAt: new Date().toISOString(),
        })
        .onConflictDoNothing();

      await db
        .update(leads)
        .set({
          channelState: 'do_not_contact',
          leadStatus: 'closed_lost',
          activeAgent: null,
          activeAgentStatus: 'Número removido por solicitação do cliente (Opt-out)',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leads.id, leadId));

      const optOutReply = 'Perfeito, já removi seu número da nossa lista. Desculpe o incômodo e um abraço!';
      await evolutionClient.sendTextMessage(lead.phone, optOutReply);

      // Record in messages
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        leadId,
        direction: 'outbound',
        sender: 'ai_sdr',
        content: optOutReply,
        createdAt: new Date().toISOString(),
      });

      return {
        intent: 'opt_out',
        reply: optOutReply,
        needsHumanCloser: false,
        summary: 'Lead solicitou opt-out e foi bloqueado permanentemente.',
      };
    }

    // Update active status
    await db
      .update(leads)
      .set({
        leadStatus: 'qualifying',
        channelState: 'ai_active',
        activeAgent: SdrAgent.AGENT_NAME,
        activeAgentStatus: 'Analisando histórico e conduzindo qualificação SPIN Selling...',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leads.id, leadId));

    // Fetch conversation history
    const history = sqlite
      .prepare('SELECT sender, content, created_at FROM messages WHERE lead_id = ? ORDER BY created_at ASC')
      .all(leadId) as any[];

    const dossier = sqlite
      .prepare('SELECT * FROM diagnostic_dossiers WHERE lead_id = ? ORDER BY created_at DESC')
      .get(leadId) as any;

    const availableSlots = await googleCalendarClient.getAvailableSlots(3);
    const slotOptionsText = availableSlots
      .slice(0, 2)
      .map((s) => s.formattedTime)
      .join(' ou ');

    const systemPrompt = `Você é o SdrAgent da LegenTech (${config.COMPANY_NAME}), conduzindo atendimento consultivo via WhatsApp com o método SPIN Selling.
Engenheiro & Diretor responsável: ${config.OWNER_NAME} (${config.OWNER_ROLE}).
Link de agendamento: ${config.GOOGLE_CALENDAR_LINK}
Horários sugeridos disponíveis na agenda: ${slotOptionsText}

Afirmações verificadas permitidas:
${config.VERIFIED_CLAIMS.map((c) => `- ${c}`).join('\n')}

GATILHOS DE HANDOFF HUMANO OBRIGATÓRIOS (needs_human_closer = true):
- Se o cliente pedir proposta de preço / orçamento final.
- Se o cliente aceitar agendar reunião ou indicar um horário.
- Se o cliente fizer uma pergunta técnica crítica e específica.
- Se demonstrar intenção imediata de fechar.
Quando needs_human_closer = true:
Avise gentilmente que você vai passar o contato para o ${config.OWNER_NAME} (${config.OWNER_ROLE}) que assume a conversa pessoalmente a partir de agora.

Retorne estritamente um JSON:
{
  "intent": "curious_about_solution" | "shared_current_pain" | "asked_how_it_works" | "asked_pricing" | "objection_already_have_system" | "objection_too_small" | "objection_no_time" | "technical_critical_question" | "ready_to_buy_or_meet" | "not_the_owner" | "not_interested" | "opt_out",
  "reply": "Texto de resposta curto e humanizado (máximo 40 palavras)",
  "needsHumanCloser": boolean,
  "summary": "Resumo em 1 frase da situação atual"
}`;

    const conversationContext = history.map((m) => `[${m.sender}]: ${m.content}`).join('\n');
    const userPrompt = `Dossiê da empresa:
Empresa: ${lead.company_name}
Decisor: ${lead.decision_maker_name || 'Gestor'}
Gargalo: ${dossier?.primary_bottleneck || lead.primary_bottleneck}

Histórico da conversa:
${conversationContext}
[lead (NOVA MENSAGEM)]: ${incomingText}`;

    const llmRes = await callLLM({
      agentName: SdrAgent.AGENT_NAME,
      leadId,
      model: process.env.MODEL_SMART || 'gpt-4o',
      systemPrompt,
      userPrompt,
      purpose: 'SPIN Selling response and intent classification',
    });

    let parsed: SdrResponse;
    try {
      const cleaned = llmRes.content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = SdrResponseSchema.parse(JSON.parse(cleaned));
    } catch {
      // Deterministic fallback
      const wantsToMeetOrPrice =
        normalizedInbound.includes('preço') ||
        normalizedInbound.includes('valor') ||
        normalizedInbound.includes('orçamento') ||
        normalizedInbound.includes('reunião') ||
        normalizedInbound.includes('call') ||
        normalizedInbound.includes('fechar') ||
        normalizedInbound.includes('agenda');

      if (wantsToMeetOrPrice) {
        parsed = {
          intent: 'ready_to_buy_or_meet',
          reply: `Perfeito! Para entender o detalhe da sua rotina e passar os valores exatos de setup e manutenção, vou transferir agora mesmo para o ${config.OWNER_NAME} (${config.OWNER_ROLE}) que vai falar diretamente com você por aqui.`,
          needsHumanCloser: true,
          summary: 'Lead solicitou valores/reunião e foi transferido para Gabriel Valença.',
        };
      } else {
        parsed = {
          intent: 'shared_current_pain',
          reply: `Compreendo perfeitamente. Esse é exatamente o ponto onde o atendimento manual costuma deixar clientes sem retorno. Nosso CRM centraliza tudo em Kanban e automatiza lembretes.`,
          needsHumanCloser: false,
          summary: 'Explorando dor de atendimento.',
        };
      }
    }

    // If intent requires human closer, execute immediate handoff!
    if (parsed.needsHumanCloser) {
      await this.triggerHumanHandoff({
        lead,
        reason: parsed.summary,
        lastMessage: incomingText,
      });
    }

    // Dispatch reply to WhatsApp via Evolution API
    if (parsed.reply) {
      await evolutionClient.sendHumanizedBubbles(lead.phone, [parsed.reply]);

      // Record outbound in messages
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        leadId,
        direction: 'outbound',
        sender: 'ai_sdr',
        content: parsed.reply,
        createdAt: new Date().toISOString(),
      });
    }

    return parsed;
  }

  public async triggerHumanHandoff(params: { lead: any; reason: string; lastMessage: string }): Promise<void> {
    const config = getBusinessConfig();
    const db = getDb();
    const now = new Date().toISOString();

    // Lock channel to HUMAN_LOCKED and move card to waiting_human_closer
    await db
      .update(leads)
      .set({
        leadStatus: 'waiting_human_closer',
        channelState: 'human_locked',
        activeAgent: null,
        activeAgentStatus: '🔒 Trava humana ativa: aguardando Gabriel Valença fechar',
        updatedAt: now,
      })
      .where(eq(leads.id, params.lead.id));

    // Send urgent push notification to OWNER_PERSONAL_WHATSAPP
    const urgentMessage = `🚨 *OPORTUNIDADE QUALIFICADA — HANDOFF LEGEN TECH*
• *Empresa:* ${params.lead.company_name}
• *Decisor:* ${params.lead.decision_maker_name || 'Gestor'} (${params.lead.phone})
• *Cidade:* ${params.lead.city}
• *Gargalo:* ${params.lead.primary_bottleneck || 'Auditoria de CRM/BI'}
• *Última Mensagem do Lead:* "${params.lastMessage}"
• *Motivo do Handoff:* ${params.reason}
👉 *Ação:* A IA foi pausada neste número (HUMAN_LOCKED). Assuma a conversa no WhatsApp para fechar a proposta!`;

    await evolutionClient.notifyOperator(urgentMessage);
  }
}

export const sdrAgent = new SdrAgent();
