import { z } from 'zod';
import { getBusinessConfig } from '@/config/business';
import { localScraper, DiscoveredBusiness } from '@/integrations/scraper';
import { evolutionClient } from '@/integrations/evolution-whatsapp/client';
import { getDb, getSqlite } from '@/db';
import { leads, doNotContact } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export const ScoutOutputSchema = z.object({
  discoveredCount: z.number(),
  insertedLeads: z.array(
    z.object({
      id: z.string(),
      companyName: z.string(),
      decisionMakerName: z.string().optional(),
      phone: z.string(),
      segment: z.string(),
      city: z.string(),
    })
  ),
  skippedDuplicates: z.number(),
  skippedDoNotContact: z.number(),
});

export type ScoutOutput = z.infer<typeof ScoutOutputSchema>;

export class ScoutAgent {
  public static readonly AGENT_NAME = 'ScoutAgent';

  public async run(limit = 3): Promise<ScoutOutput> {
    const config = getBusinessConfig();
    const db = getDb();
    const sqlite = getSqlite();

    const companies = await localScraper.discoverCompanies(limit);
    const insertedLeads: ScoutOutput['insertedLeads'] = [];
    let skippedDuplicates = 0;
    let skippedDoNotContact = 0;

    for (const comp of companies) {
      const cleanPhone = comp.phone.replace(/\D/g, '');

      // 1. Check Do Not Contact list
      const dnc = sqlite.prepare('SELECT phone FROM do_not_contact WHERE phone = ?').get(cleanPhone);
      if (dnc) {
        skippedDoNotContact++;
        continue;
      }

      // 2. Check duplicate by phone or CNPJ
      const existing = sqlite
        .prepare('SELECT id FROM leads WHERE phone = ? OR (cnpj IS NOT NULL AND cnpj = ?)')
        .get(cleanPhone, comp.cnpj);

      if (existing) {
        skippedDuplicates++;
        continue;
      }

      // 3. Validate WhatsApp number via Evolution API
      const validation = await evolutionClient.validateNumber(cleanPhone);
      const channelState = validation.valid ? 'whatsapp_pending_validation' : 'whatsapp_invalid';

      const leadId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(leads).values({
        id: leadId,
        companyName: comp.companyName,
        tradeName: comp.tradeName,
        decisionMakerName: comp.decisionMakerName,
        cnpj: comp.cnpj,
        segment: comp.segment,
        city: comp.city,
        phone: cleanPhone,
        website: comp.website,
        mapsUrl: comp.mapsUrl,
        icpScore: 50, // Base discovery score, updated later by Auditor
        leadStatus: 'discovered',
        channelState,
        activeAgent: 'ScoutAgent',
        activeAgentStatus: 'Cadastrado e validado no WhatsApp',
        primaryBottleneck: null,
        archived: 0,
        createdAt: now,
        updatedAt: now,
      });

      insertedLeads.push({
        id: leadId,
        companyName: comp.companyName,
        decisionMakerName: comp.decisionMakerName,
        phone: cleanPhone,
        segment: comp.segment,
        city: comp.city,
      });
    }

    return ScoutOutputSchema.parse({
      discoveredCount: insertedLeads.length,
      insertedLeads,
      skippedDuplicates,
      skippedDoNotContact,
    });
  }
}

export const scoutAgent = new ScoutAgent();
