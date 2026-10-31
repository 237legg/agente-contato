import { NextResponse } from 'next/server';
import { getDb, getSqlite } from '@/db';
import { leads } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { googleCalendarClient } from '@/integrations/google-calendar/client';
import { evolutionClient } from '@/integrations/evolution-whatsapp/client';
import { getBusinessConfig } from '@/config/business';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json().catch(() => ({}));
    const { startTime, email } = body;

    const sqlite = getSqlite();
    const db = getDb();
    const config = getBusinessConfig();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Default to tomorrow 14:30 if not specified
    let targetTime = startTime;
    if (!targetTime) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 30, 0, 0);
      targetTime = tomorrow.toISOString();
    }

    const meeting = await googleCalendarClient.createMeeting({
      companyName: lead.company_name,
      decisionMakerName: lead.decision_maker_name,
      phone: lead.phone,
      email,
      startTime: targetTime,
    });

    const now = new Date().toISOString();

    // Update lead record
    await db
      .update(leads)
      .set({
        leadStatus: 'waiting_human_closer',
        channelState: 'human_locked',
        scheduledCalendarTime: meeting.startTime,
        scheduledCalendarEventId: meeting.eventId,
        googleMeetUrl: meeting.meetUrl,
        activeAgent: null,
        activeAgentStatus: `📅 Reunião agendada para ${new Date(meeting.startTime).toLocaleString('pt-BR')}`,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    // Send confirmation message to client
    const confirmationText = `Perfeito! Reunião de demonstração confirmada para ${new Date(meeting.startTime).toLocaleString('pt-BR')}. Link da sala: ${meeting.meetUrl} com ${config.OWNER_NAME}. Até logo!`;
    await evolutionClient.sendTextMessage(lead.phone, confirmationText);

    // Urgent notification to operator
    const urgentOperatorText = `🚨 *NOVA REUNIÃO AGENDADA NO GOOGLE CALENDAR*
• *Lead:* ${lead.company_name} (${lead.decision_maker_name || 'Decisor'})
• *Telefone:* ${lead.phone}
• *Horário:* ${new Date(meeting.startTime).toLocaleString('pt-BR')}
• *Google Meet:* ${meeting.meetUrl}
Canal travado em HUMAN_LOCKED para você conduzir.`;
    await evolutionClient.notifyOperator(urgentOperatorText);

    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
