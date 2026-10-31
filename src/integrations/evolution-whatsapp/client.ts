import { getBusinessConfig } from '@/config/business';

export interface WhatsAppValidationResult {
  valid: boolean;
  formattedJid: string;
  isBusiness?: boolean;
}

export class EvolutionWhatsAppClient {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;
  private isMock: boolean;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || 'mock_key';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'legentech';
    this.isMock = process.env.MOCK_WHATSAPP_ENABLED === 'true' || process.env.DRY_RUN === 'true' || !process.env.EVOLUTION_API_URL;
  }

  public async validateNumber(phone: string): Promise<WhatsAppValidationResult> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return { valid: false, formattedJid: '' };
    }

    if (this.isMock) {
      // Deterministic validation: 10+ digits are valid
      return {
        valid: true,
        formattedJid: `${cleanPhone}@s.whatsapp.net`,
        isBusiness: true,
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/chat/whatsappNumbers/${this.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({ numbers: [cleanPhone] }),
      });

      if (!res.ok) {
        return { valid: false, formattedJid: `${cleanPhone}@s.whatsapp.net` };
      }

      const data = await res.json();
      const first = data[0];
      return {
        valid: Boolean(first?.exists),
        formattedJid: first?.jid || `${cleanPhone}@s.whatsapp.net`,
        isBusiness: Boolean(first?.isBusiness),
      };
    } catch {
      return { valid: true, formattedJid: `${cleanPhone}@s.whatsapp.net` };
    }
  }

  public async sendPresenceComposing(phone: string, durationMs: number): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (this.isMock) {
      // In mock/dry-run, small artificial delay if needed
      await new Promise((r) => setTimeout(r, Math.min(durationMs, 100)));
      return;
    }

    try {
      await fetch(`${this.apiUrl}/chat/sendPresence/${this.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: cleanPhone,
          presence: 'composing',
          delay: durationMs,
        }),
      });
    } catch (err) {
      console.warn('Failed to send composing presence:', err);
    }
  }

  public async sendTextMessage(phone: string, text: string): Promise<{ success: boolean; messageId: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const simulatedMessageId = `evo_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    if (this.isMock) {
      console.log(`[WhatsApp Mock Send to ${cleanPhone}]: ${text}`);
      return { success: true, messageId: simulatedMessageId };
    }

    try {
      const res = await fetch(`${this.apiUrl}/message/sendText/${this.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: cleanPhone,
          text,
        }),
      });

      if (!res.ok) {
        throw new Error(`Evolution API error: ${res.statusText}`);
      }

      const data = await res.json();
      return { success: true, messageId: data?.key?.id || simulatedMessageId };
    } catch (err) {
      console.error('Failed to send text via Evolution API:', err);
      return { success: false, messageId: simulatedMessageId };
    }
  }

  public async sendHumanizedBubbles(phone: string, bubbles: string[]): Promise<string[]> {
    const sentIds: string[] = [];

    for (const bubble of bubbles) {
      if (!bubble.trim()) continue;

      // Humanized composing duration: Math.min(Math.max(text.length * 45, 1800), 5500)
      const composingDuration = Math.min(Math.max(bubble.length * 45, 1800), 5500);
      await this.sendPresenceComposing(phone, composingDuration);

      const result = await this.sendTextMessage(phone, bubble);
      sentIds.push(result.messageId);

      // Short delay between bubbles
      if (!this.isMock) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    return sentIds;
  }

  public async notifyOperator(message: string): Promise<void> {
    const config = getBusinessConfig();
    const operatorPhone = config.OWNER_PERSONAL_WHATSAPP;
    console.log(`[URGENT OPERATOR NOTIFICATION to ${operatorPhone}]:\n${message}`);
    await this.sendTextMessage(operatorPhone, message);
  }
}

export const evolutionClient = new EvolutionWhatsAppClient();
