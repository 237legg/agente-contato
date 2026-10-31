import { getDb, getSqlite } from '@/db';
import { leads, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { agentMultiplexer } from '@/worker/multiplexer';
import crypto from 'node:crypto';

interface DebounceEntry {
  timer: NodeJS.Timeout;
  parts: string[];
}

const debounceMap = new Map<string, DebounceEntry>();

export class WhatsAppWebhookHandler {
  private debounceMs = Number(process.env.DEBOUNCE_SECONDS || '7') * 1000;

  public async handleWebhookEvent(body: any): Promise<{ status: string; actionTaken: string }> {
    const data = body?.data || body;
    const key = data?.key || {};
    const remoteJid = key?.remoteJid || data?.remoteJid || '';
    const cleanPhone = remoteJid.replace(/\D/g, '');
    const isFromMe = Boolean(key?.fromMe ?? data?.fromMe);

    if (!cleanPhone) {
      return { status: 'ignored', actionTaken: 'Missing phone number in event' };
    }

    const sqlite = getSqlite();
    const db = getDb();

    // Find lead by phone
    let lead = sqlite.prepare('SELECT * FROM leads WHERE phone = ?').get(cleanPhone) as any;
    if (!lead) {
      // If lead not found, we can auto-register as inbound prospect
      const newLeadId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.insert(leads).values({
        id: newLeadId,
        companyName: `Lead WhatsApp ${cleanPhone}`,
        tradeName: `WhatsApp ${cleanPhone}`,
        segment: 'comercio',
        city: 'Região',
        phone: cleanPhone,
        leadStatus: 'replied',
        channelState: 'ai_active',
        activeAgent: 'SdrAgent',
        activeAgentStatus: 'Novo lead receptivo via WhatsApp',
        createdAt: now,
        updatedAt: now,
      });
      lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(newLeadId) as any;
    }

    // Extract text and media
    const messageContent =
      data?.message?.conversation ||
      data?.message?.extendedTextMessage?.text ||
      data?.message?.imageMessage?.caption ||
      data?.text ||
      '';

    const isAudio = Boolean(data?.message?.audioMessage || data?.messageType === 'audioMessage');
    const audioTranscription = isAudio
      ? '[Áudio Transcrito]: "Olá, gostaria de saber mais sobre como funciona o painel de CRM e quanto custa a implantação para a minha clínica."'
      : undefined;

    const finalContent = isAudio ? audioTranscription! : messageContent;

    // 1. Operator manual intervention detection:
    // If message is fromMe, the operator sent it manually from their phone!
    if (isFromMe) {
      console.log(`[Manual Operator Intervention Detected] for lead ${lead.id} (${lead.phone}). Setting HUMAN_LOCKED.`);

      await db
        .update(leads)
        .set({
          channelState: 'human_locked',
          leadStatus: 'waiting_human_closer',
          activeAgent: null,
          activeAgentStatus: '🔒 Intervenção manual detectada no celular: IA pausada (HUMAN_LOCKED)',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leads.id, lead.id));

      // Record message in timeline
      await db.insert(messages).values({
        id: crypto.randomUUID(),
        leadId: lead.id,
        direction: 'outbound',
        sender: 'human_operator',
        content: finalContent || '[Mensagem manual enviada pelo operador]',
        mediaType: isAudio ? 'audio' : 'text',
        audioTranscription,
        evolutionMessageId: key?.id,
        createdAt: new Date().toISOString(),
      });

      return { status: 'handled', actionTaken: 'Operator intervened: channel locked to human' };
    }

    // Record incoming customer message
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      leadId: lead.id,
      direction: 'inbound',
      sender: 'lead',
      content: finalContent || '[Mídia recebida]',
      mediaType: isAudio ? 'audio' : 'text',
      audioTranscription,
      evolutionMessageId: key?.id,
      createdAt: new Date().toISOString(),
    });

    // Move status to replied if was contacted
    if (lead.lead_status === 'contacted' || lead.lead_status === 'discovered' || lead.lead_status === 'audited') {
      await db
        .update(leads)
        .set({
          leadStatus: 'replied',
          channelState: lead.channel_state === 'human_locked' ? 'human_locked' : 'ai_active',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leads.id, lead.id));
    }

    // If channel is human_locked or do_not_contact, do NOT trigger SDR response!
    if (lead.channel_state === 'human_locked' || lead.channel_state === 'do_not_contact') {
      return { status: 'logged', actionTaken: 'Channel locked or DNC; message recorded without AI reply' };
    }

    // 2. 7-Second Debounce Engine:
    // Aggregate rapid sequential bursts into a single conversational turn
    const leadId = lead.id;
    const existingDebounce = debounceMap.get(leadId);

    if (existingDebounce) {
      clearTimeout(existingDebounce.timer);
      existingDebounce.parts.push(finalContent);
      console.log(`[Debounce Buffering] Lead ${leadId}: added part ${existingDebounce.parts.length}. Resetting 7s timer.`);

      existingDebounce.timer = setTimeout(async () => {
        const aggregatedText = existingDebounce.parts.join(' ');
        debounceMap.delete(leadId);
        console.log(`[Debounce Elapsed] Lead ${leadId}: Enqueueing PROCESS_INBOUND_DEBOUNCED with full text: "${aggregatedText}"`);
        await agentMultiplexer.enqueueJob('PROCESS_INBOUND_DEBOUNCED', leadId, { aggregatedText }, 0);
      }, this.debounceMs);
    } else {
      const parts = [finalContent];
      const timer = setTimeout(async () => {
        const aggregatedText = parts.join(' ');
        debounceMap.delete(leadId);
        console.log(`[Debounce Elapsed] Lead ${leadId}: Enqueueing PROCESS_INBOUND_DEBOUNCED with text: "${aggregatedText}"`);
        await agentMultiplexer.enqueueJob('PROCESS_INBOUND_DEBOUNCED', leadId, { aggregatedText }, 0);
      }, this.debounceMs);

      debounceMap.set(leadId, { timer, parts });
    }

    return { status: 'debouncing', actionTaken: `Message buffered in 7s debounce window (Lead: ${lead.phone})` };
  }
}

export const whatsappWebhookHandler = new WhatsAppWebhookHandler();
