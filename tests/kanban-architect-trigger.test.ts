import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb, getSqlite } from '@/db';
import { leads, dealHandoverSpecs, diagnosticDossiers, messages } from '@/db/schema';
import { architectAgent } from '@/agents/architect';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

describe('8. Kanban Drag-and-Drop Trigger to Autonomous Software Factory', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
  });

  it('consolidates dossier, WhatsApp chat and handover spec, then physically generates project files', async () => {
    const db = getDb();
    const leadId = crypto.randomUUID();
    const slug = 'clinica-dentale-teste';

    // 1. Setup lead
    await db.insert(leads).values({
      id: leadId,
      companyName: 'Clínica Dentale Teste',
      tradeName: 'Dentale Teste',
      decisionMakerName: 'Dr. Renato',
      phone: '5512999001122',
      segment: 'clinica',
      city: 'Itajubá - MG',
      leadStatus: 'project_approved',
      channelState: 'human_locked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Setup dossier
    await db.insert(diagnosticDossiers).values({
      id: crypto.randomUUID(),
      leadId,
      digitalPresence: JSON.stringify({ website: true }),
      reviewsSummary: JSON.stringify({ evidence: 'Pacientes reclamam de falta de confirmação' }),
      primaryBottleneck: 'Falta de confirmação de consultas no WhatsApp gerando faltas',
      secondaryBottlenecks: JSON.stringify(['Recepção sobrecarregada']),
      financialLossEstimate: 4000,
      conservativeRoi: 'Recuperando 3 consultas/semana o sistema gera R$ 3.500 adicionais.',
      recommendedStack: JSON.stringify(['Kanban WhatsApp', 'Dashboard BI']),
      createdAt: new Date().toISOString(),
    });

    // 3. Setup handover spec
    await db.insert(dealHandoverSpecs).values({
      id: crypto.randomUUID(),
      leadId,
      projectSlug: slug,
      clientTradeName: 'Dentale Teste',
      niche: 'clinica',
      agreedSetupPrice: 3500,
      agreedMonthlyPrice: 650,
      requestedFeatures: JSON.stringify([
        'Kanban de Atendimento WhatsApp',
        'Lembretes Automáticos Anti-No-Show',
        'Dashboard BI de Faturamento',
      ]),
      specialInstructions: 'Integração direta com o número do consultório.',
      confirmedByOperator: 1,
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // 4. Run ArchitectAgent
    const result = await architectAgent.buildProject(leadId);

    expect(result.status).toBe('completed');
    expect(result.projectSlug).toBe(slug);

    // 5. Verify physical files exist in projects/<slug>/
    const projectDir = path.resolve(process.cwd(), 'projects', slug);
    expect(fs.existsSync(projectDir)).toBe(true);

    const prdPath = path.join(projectDir, 'PRD.md');
    const claudePath = path.join(projectDir, 'CLAUDE.md');
    const schemaPath = path.join(projectDir, 'src/db/schema.ts');
    const biPath = path.join(projectDir, 'src/bi/metrics.ts');

    expect(fs.existsSync(prdPath)).toBe(true);
    expect(fs.existsSync(claudePath)).toBe(true);
    expect(fs.existsSync(schemaPath)).toBe(true);
    expect(fs.existsSync(biPath)).toBe(true);

    const prdText = fs.readFileSync(prdPath, 'utf-8');
    expect(prdText).toContain('Dentale Teste');
    expect(prdText).toContain('LegenTech');

    // 6. Verify lead transitioned to 'delivered'
    const sqlite = getSqlite();
    const updatedLead = sqlite.prepare('SELECT lead_status FROM leads WHERE id = ?').get(leadId) as any;
    expect(updatedLead.lead_status).toBe('delivered');
  });
});
