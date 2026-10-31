import { NextResponse } from 'next/server';
import { getDb, getSqlite } from '@/db';
import { messages, leads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { evolutionClient } from '@/integrations/evolution-whatsapp/client';
import { whatsappWebhookHandler } from '@/features/conversations/webhook-handler';
import crypto from 'node:crypto';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const sqlite = getSqlite();

    const list = sqlite
      .prepare('SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC')
      .all(leadId);

    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { content, sender = 'human_operator', isAudio = false } = body;

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const sqlite = getSqlite();
    const db = getDb();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. If sent by human operator:
    if (sender === 'human_operator') {
      await evolutionClient.sendTextMessage(lead.phone, content);

      // Lock channel to human_locked
      await db
        .update(leads)
        .set({
          channelState: 'human_locked',
          leadStatus: lead.lead_status === 'contacted' ? 'replied' : lead.lead_status,
          activeAgent: null,
          activeAgentStatus: '🔒 Operador assumiu o chat (HUMAN_LOCKED)',
          updatedAt: now,
        })
        .where(eq(leads.id, leadId));

      const messageId = crypto.randomUUID();
      await db.insert(messages).values({
        id: messageId,
        leadId,
        direction: 'outbound',
        sender: 'human_operator',
        content,
        mediaType: 'text',
        createdAt: now,
      });

      return NextResponse.json({ success: true, messageId, sender: 'human_operator' });
    }

    // 2. If simulating customer inbound message (or audio):
    if (sender === 'lead') {
      const webhookPayload = {
        data: {
          key: {
            remoteJid: `${lead.phone}@s.whatsapp.net`,
            fromMe: false,
            id: `sim_${Date.now()}`,
          },
          messageType: isAudio ? 'audioMessage' : 'conversation',
          message: isAudio
            ? { audioMessage: { url: 'mock_audio.mp3' } }
            : { conversation: content },
          text: content,
        },
      };

      const webhookRes = await whatsappWebhookHandler.handleWebhookEvent(webhookPayload);
      return NextResponse.json({ success: true, sender: 'lead', webhookRes });
    }

    return NextResponse.json({ error: 'Invalid sender' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
