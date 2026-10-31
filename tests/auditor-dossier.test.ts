import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb, getSqlite } from '@/db';
import { leads } from '@/db/schema';
import { auditorAgent } from '@/agents/auditor';
import crypto from 'node:crypto';

describe('3. AuditorAgent CRM/BI Dossier and ROI Calculation', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
  });

  it('generates diagnostic dossier with financial loss and updates lead status to audited', async () => {
    const db = getDb();
    const leadId = crypto.randomUUID();

    await db.insert(leads).values({
      id: leadId,
      companyName: 'Restaurante Sabor da Serra',
      tradeName: 'Sabor da Serra',
      decisionMakerName: 'Fabio',
      segment: 'restaurante',
      city: 'Pouso Alegre - MG',
      phone: '5535998877665',
      leadStatus: 'discovered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const dossier = await auditorAgent.auditLead(leadId);

    expect(dossier.icp_score).toBeGreaterThan(0);
    expect(dossier.primary_bottleneck).toBeTruthy();
    expect(dossier.financial_leakage_estimate_brl).toBeGreaterThan(1000);
    expect(dossier.conservative_roi).toBeTruthy();
    expect(dossier.recommended_stack.length).toBeGreaterThanOrEqual(1);

    const sqlite = getSqlite();
    const updatedLead = sqlite.prepare('SELECT lead_status, icp_score FROM leads WHERE id = ?').get(leadId) as any;
    expect(updatedLead.lead_status).toBe('audited');
    expect(updatedLead.icp_score).toBe(dossier.icp_score);
  });
});
