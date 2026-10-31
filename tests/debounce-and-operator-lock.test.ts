import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb, getSqlite } from '@/db';
import { leads } from '@/db/schema';
import { whatsappWebhookHandler } from '@/features/conversations/webhook-handler';
import crypto from 'node:crypto';

describe('5 & 6. Debounce Engine and Manual Operator Intervention Lock', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
  });

  it('detects manual operator message (fromMe: true) and instantly locks channel to human_locked', async () => {
    const db = getDb();
    const leadId = crypto.randomUUID();
    const phone = '5512999887766';

    await db.insert(leads).values({
      id: leadId,
      companyName: 'Padaria Central',
      phone,
      segment: 'comercio',
      city: 'Itajubá - MG',
      leadStatus: 'qualifying',
      channelState: 'ai_active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Webhook with fromMe: true sent by operator's phone
    const operatorPayload = {
      data: {
        key: {
          remoteJid: `${phone}@s.whatsapp.net`,
          fromMe: true,
          id: 'manual_msg_001',
        },
        message: {
          conversation: 'Oi, Gabriel aqui! Vou te passar a proposta agora.',
        },
      },
    };

    const res = await whatsappWebhookHandler.handleWebhookEvent(operatorPayload);
    expect(res.status).toBe('handled');
    expect(res.actionTaken).toContain('Operator intervened');

    const sqlite = getSqlite();
    const updatedLead = sqlite.prepare('SELECT channel_state, lead_status FROM leads WHERE id = ?').get(leadId) as any;
    expect(updatedLead.channel_state).toBe('human_locked');
    expect(updatedLead.lead_status).toBe('waiting_human_closer');
  });

  it('buffers fast incoming customer messages in the 7s debounce window', async () => {
    const db = getDb();
    const leadId = crypto.randomUUID();
    const phone = '5512999112233';

    await db.insert(leads).values({
      id: leadId,
      companyName: 'Lanchonete Silva',
      phone,
      segment: 'restaurante',
      city: 'Itajubá - MG',
      leadStatus: 'contacted',
      channelState: 'ai_active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const inboundMsg1 = {
      data: {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false, id: 'in_1' },
        message: { conversation: 'Oi' },
      },
    };

    const inboundMsg2 = {
      data: {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false, id: 'in_2' },
        message: { conversation: 'Vi a mensagem de vocês aqui' },
      },
    };

    const res1 = await whatsappWebhookHandler.handleWebhookEvent(inboundMsg1);
    expect(res1.status).toBe('debouncing');

    const res2 = await whatsappWebhookHandler.handleWebhookEvent(inboundMsg2);
    expect(res2.status).toBe('debouncing');
  });
});
