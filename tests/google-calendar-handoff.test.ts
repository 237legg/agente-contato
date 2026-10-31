import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb, getSqlite } from '@/db';
import { leads } from '@/db/schema';
import { googleCalendarClient } from '@/integrations/google-calendar/client';
import { sdrAgent } from '@/agents/sdr';
import crypto from 'node:crypto';

describe('7. Google Calendar Integration and Human Closer Handoff', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
  });

  it('provides available calendar slots and creates Google Meet meeting', async () => {
    const slots = await googleCalendarClient.getAvailableSlots(3);
    expect(slots.length).toBeGreaterThanOrEqual(2);
    expect(slots[0].startTime).toBeTruthy();
    expect(slots[0].formattedTime).toBeTruthy();

    const meeting = await googleCalendarClient.createMeeting({
      companyName: 'Clínica OdontoVale',
      decisionMakerName: 'Dr. Lucas',
      phone: '5512991234567',
      startTime: slots[0].startTime,
    });

    expect(meeting.eventId).toBeTruthy();
    expect(meeting.meetUrl).toContain('meet.google.com');
  });

  it('triggers human handoff and locks channel when lead asks for price or meeting', async () => {
    const db = getDb();
    const leadId = crypto.randomUUID();

    await db.insert(leads).values({
      id: leadId,
      companyName: 'Studio Beleza Pura',
      phone: '5512999443322',
      segment: 'clinica',
      city: 'Itajubá - MG',
      leadStatus: 'qualifying',
      channelState: 'ai_active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await sdrAgent.processInboundMessage(
      leadId,
      'Gostaria de agendar uma demonstração e ver os valores do orçamento.'
    );

    expect(response.needsHumanCloser).toBe(true);

    const sqlite = getSqlite();
    const lead = sqlite.prepare('SELECT channel_state, lead_status FROM leads WHERE id = ?').get(leadId) as any;
    expect(lead.channel_state).toBe('human_locked');
    expect(lead.lead_status).toBe('waiting_human_closer');
  });
});
