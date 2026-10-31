import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb } from '@/db';
import { leads, doNotContact } from '@/db/schema';
import { scoutAgent } from '@/agents/scout';
import crypto from 'node:crypto';

describe('2 & 9. Scout Deduplication and Do-Not-Contact Blocking', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
  });

  it('prevents inserting duplicate phone numbers or CNPJ', async () => {
    const db = getDb();
    const phone = '5512991234567'; // Matches first seed item in localScraper
    const cnpj = '45.123.890/0001-12';

    // Insert manually first
    await db.insert(leads).values({
      id: crypto.randomUUID(),
      companyName: 'Clínica OdontoVale Ltda Existente',
      cnpj,
      phone,
      segment: 'clinica',
      city: 'Itajubá - MG',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Run scout
    const result = await scoutAgent.run(5);
    expect(result.skippedDuplicates).toBeGreaterThanOrEqual(1);
  });

  it('strictly blocks numbers present in do_not_contact list', async () => {
    const db = getDb();
    const phone = '5512997654321'; // Matches second seed item (Burgueria)

    // Add to do_not_contact table
    await db.insert(doNotContact).values({
      phone,
      reason: 'User opted out',
      createdAt: new Date().toISOString(),
    });

    const result = await scoutAgent.run(5);
    expect(result.skippedDoNotContact).toBeGreaterThanOrEqual(1);
  });
});
