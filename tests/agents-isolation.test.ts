import { describe, it, expect, beforeAll } from 'vitest';
import { initializeDatabase, getDb } from '@/db';
import { leads } from '@/db/schema';
import { scoutAgent, ScoutOutputSchema } from '@/agents/scout';
import { auditorAgent, AuditorDossierSchema } from '@/agents/auditor';
import { copywriterAgent, CopywriterOutputSchema } from '@/agents/copywriter';
import { criticAgent, CriticEvaluationSchema } from '@/agents/critic';
import { sdrAgent, SdrResponseSchema } from '@/agents/sdr';
import { architectAgent, ArchitectBuildResultSchema } from '@/agents/architect';
import crypto from 'node:crypto';

describe('1. Agent Isolation, Multiplexing and Zod Validation', () => {
  let testLeadId: string;

  beforeAll(async () => {
    initializeDatabase(':memory:');
    const db = getDb();
    testLeadId = crypto.randomUUID();

    await db.insert(leads).values({
      id: testLeadId,
      companyName: 'Clínica Sorriso Sul Ltda',
      tradeName: 'Sorriso Sul Odonto',
      decisionMakerName: 'Dr. Roberto',
      cnpj: '99.888.777/0001-11',
      segment: 'clinica',
      city: 'Itajubá - MG',
      phone: '5512999998888',
      icpScore: 80,
      leadStatus: 'discovered',
      channelState: 'whatsapp_pending_validation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('ScoutAgent discovers leads and validates output with Zod', async () => {
    const output = await scoutAgent.run(1);
    const parsed = ScoutOutputSchema.safeParse(output);
    expect(parsed.success).toBe(true);
    expect(output.discoveredCount).toBeGreaterThanOrEqual(1);
  });

  it('AuditorAgent diagnoses CRM/BI failure and returns valid Zod dossier', async () => {
    const dossier = await auditorAgent.auditLead(testLeadId);
    const parsed = AuditorDossierSchema.safeParse(dossier);
    expect(parsed.success).toBe(true);
    expect(dossier.primary_bottleneck).toBeDefined();
    expect(dossier.financial_leakage_estimate_brl).toBeGreaterThan(0);
  });

  it('CopywriterAgent generates 3-bubble copy validated with Zod', async () => {
    const output = await copywriterAgent.generateOutreach(testLeadId);
    const parsed = CopywriterOutputSchema.safeParse(output);
    expect(parsed.success).toBe(true);
    expect(output.bubbles.length).toBe(3);
    expect(output.wordCount).toBeLessThanOrEqual(50);
  });

  it('CriticAgent evaluates copy strictly with Zod validation', () => {
    const evaluation = criticAgent.evaluateDraft([
      'Dr. Roberto, vi a Sorriso Sul aqui em Itajubá.',
      'Ajudamos clínicas a eliminar no-show no WhatsApp com CRM e painel de BI.',
      'Como vocês controlam os retornos hoje?',
    ]);
    const parsed = CriticEvaluationSchema.safeParse(evaluation);
    expect(parsed.success).toBe(true);
    expect(evaluation.approved).toBe(true);
  });

  it('SdrAgent processes conversation turn with SPIN Selling schema', async () => {
    const response = await sdrAgent.processInboundMessage(
      testLeadId,
      'Como funciona o painel de BI e quanto custa o setup?'
    );
    const parsed = SdrResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
    expect(response.needsHumanCloser).toBe(true);
  });

  it('ArchitectAgent builds project and validates result schema', async () => {
    const result = await architectAgent.buildProject(testLeadId);
    const parsed = ArchitectBuildResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.status).toBe('completed');
    expect(result.filesGenerated).toContain('PRD.md');
    expect(result.filesGenerated).toContain('CLAUDE.md');
  });
});
