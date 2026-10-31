import { NextResponse } from 'next/server';
import { getDb, getSqlite } from '@/db';
import { leads } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { channelState } = body; // 'ai_active' | 'human_locked' | 'do_not_contact'

    if (!channelState) {
      return NextResponse.json({ error: 'Missing channelState' }, { status: 400 });
    }

    const db = getDb();
    const sqlite = getSqlite();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const activeAgentStatus =
      channelState === 'human_locked'
        ? '🔒 Trava humana ativada pelo operador (IA pausada)'
        : channelState === 'ai_active'
        ? '🤖 Agente reativado pelo operador'
        : 'Número marcado como Do Not Contact';

    await db
      .update(leads)
      .set({
        channelState,
        activeAgent: channelState === 'ai_active' ? 'SdrAgent' : null,
        activeAgentStatus,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    return NextResponse.json({ success: true, leadId, channelState });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
