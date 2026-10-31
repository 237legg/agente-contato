import { NextResponse } from 'next/server';
import { getDb, getSqlite } from '@/db';
import { leads, dealHandoverSpecs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { architectAgent } from '@/agents/architect';
import { agentMultiplexer } from '@/worker/multiplexer';
import crypto from 'node:crypto';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { status, handoverSpec } = body;

    if (!status) {
      return NextResponse.json({ error: 'Missing status field' }, { status: 400 });
    }

    const sqlite = getSqlite();
    const db = getDb();

    const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // If moving to project_approved (Kanban Drag-and-Drop trigger):
    if (status === 'project_approved') {
      const projectSlug = (handoverSpec?.projectSlug || lead.trade_name || lead.company_name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if handover spec exists
      const existingSpec = sqlite.prepare('SELECT id FROM deal_handover_specs WHERE lead_id = ?').get(leadId);

      if (existingSpec) {
        await db
          .update(dealHandoverSpecs)
          .set({
            projectSlug,
            clientTradeName: handoverSpec?.clientTradeName || lead.trade_name || lead.company_name,
            niche: handoverSpec?.niche || lead.segment || 'comercio',
            agreedSetupPrice: handoverSpec?.agreedSetupPrice ?? 3500,
            agreedMonthlyPrice: handoverSpec?.agreedMonthlyPrice ?? 650,
            requestedFeatures: JSON.stringify(handoverSpec?.requestedFeatures || [
              'Kanban de Atendimento WhatsApp',
              'Automação de Lembretes Anti-No-Show',
              'Dashboard BI de Faturamento em Tempo Real',
            ]),
            specialInstructions: handoverSpec?.specialInstructions || 'Implantado via Funil B autônomo.',
            confirmedByOperator: 1,
            confirmedAt: now,
          })
          .where(eq(dealHandoverSpecs.leadId, leadId));
      } else {
        await db.insert(dealHandoverSpecs).values({
          id: crypto.randomUUID(),
          leadId,
          projectSlug,
          clientTradeName: handoverSpec?.clientTradeName || lead.trade_name || lead.company_name,
          niche: handoverSpec?.niche || lead.segment || 'comercio',
          agreedSetupPrice: handoverSpec?.agreedSetupPrice ?? 3500,
          agreedMonthlyPrice: handoverSpec?.agreedMonthlyPrice ?? 650,
          requestedFeatures: JSON.stringify(handoverSpec?.requestedFeatures || [
            'Kanban de Atendimento WhatsApp',
            'Automação de Lembretes Anti-No-Show',
            'Dashboard BI de Faturamento em Tempo Real',
          ]),
          specialInstructions: handoverSpec?.specialInstructions || 'Implantado via Funil B autônomo.',
          confirmedByOperator: 1,
          confirmedAt: now,
          createdAt: now,
        });
      }

      // Update lead to project_approved
      await db
        .update(leads)
        .set({
          leadStatus: 'project_approved',
          activeAgent: 'ArchitectAgent',
          activeAgentStatus: 'Projeto aprovado! Disparando ArchitectAgent em background...',
          updatedAt: now,
        })
        .where(eq(leads.id, leadId));

      // Trigger ArchitectAgent in background or direct execution
      // Execute asynchronously so response returns fast to the Kanban
      setTimeout(async () => {
        try {
          await architectAgent.buildProject(leadId);
        } catch (e) {
          console.error('[ArchitectAgent Build Error]:', e);
        }
      }, 300);

      return NextResponse.json({
        success: true,
        message: 'Lead movido para project_approved e ArchitectAgent disparado.',
        leadId,
      });
    }

    // Standard status update
    await db
      .update(leads)
      .set({
        leadStatus: status,
        updatedAt: now,
      })
      .where(eq(leads.id, leadId));

    return NextResponse.json({ success: true, leadId, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
