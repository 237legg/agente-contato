import { getBusinessConfig } from '@/config/business';

export interface CalendarSlot {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  formattedTime: string; // e.g. "Amanhã às 14:30"
}

export interface ScheduledEventResult {
  eventId: string;
  meetUrl: string;
  calendarLink: string;
  startTime: string;
  endTime: string;
  summary: string;
}

export class GoogleCalendarClient {
  private calendarId: string;
  private defaultLink: string;
  private isMock: boolean;

  constructor() {
    const config = getBusinessConfig();
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || config.GOOGLE_CALENDAR_ID;
    this.defaultLink = process.env.GOOGLE_CALENDAR_LINK || config.GOOGLE_CALENDAR_LINK;
    this.isMock = process.env.MOCK_CALENDAR_ENABLED === 'true' || !process.env.GOOGLE_CLIENT_EMAIL;
  }

  public async getAvailableSlots(daysAhead = 3): Promise<CalendarSlot[]> {
    const slots: CalendarSlot[] = [];
    const now = new Date();

    for (let dayOffset = 1; dayOffset <= daysAhead; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      // Skip weekends (0 is Sunday, 6 is Saturday)
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Provide standard realistic slots: 10:00 and 15:30
      const morningSlot = new Date(targetDate);
      morningSlot.setHours(10, 0, 0, 0);

      const afternoonSlot = new Date(targetDate);
      afternoonSlot.setHours(15, 30, 0, 0);

      const formatSlot = (d: Date) => {
        const dayName = d.toLocaleDateString('pt-BR', { weekday: 'long' });
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} às ${timeStr}`;
      };

      slots.push({
        startTime: morningSlot.toISOString(),
        endTime: new Date(morningSlot.getTime() + 30 * 60000).toISOString(),
        formattedTime: formatSlot(morningSlot),
      });

      slots.push({
        startTime: afternoonSlot.toISOString(),
        endTime: new Date(afternoonSlot.getTime() + 30 * 60000).toISOString(),
        formattedTime: formatSlot(afternoonSlot),
      });
    }

    return slots;
  }

  public async createMeeting(params: {
    companyName: string;
    decisionMakerName?: string;
    phone: string;
    email?: string;
    startTime: string;
    description?: string;
  }): Promise<ScheduledEventResult> {
    const config = getBusinessConfig();
    const startDate = new Date(params.startTime);
    const endDate = new Date(startDate.getTime() + 45 * 60000); // 45 min meeting
    const eventId = `meet_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const meetUrl = `https://meet.google.com/leg-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    const summary = `[${config.COMPANY_NAME}] Diagnóstico BI & CRM — ${params.companyName} x ${config.OWNER_NAME}`;

    return {
      eventId,
      meetUrl,
      calendarLink: this.defaultLink,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      summary,
    };
  }

  public getBookingLink(): string {
    return this.defaultLink;
  }
}

export const googleCalendarClient = new GoogleCalendarClient();
