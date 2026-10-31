import { NextResponse } from 'next/server';
import { getSqlite } from '@/db';
import { scoutAgent } from '@/agents/scout';
import { agentMultiplexer } from '@/worker/multiplexer';
import { seedInitialPipelineIfNeeded } from '@/db/seed';

export async function GET() {
  try {
    await seedInitialPipelineIfNeeded();
    const sqlite = getSqlite();

    const leads = sqlite.prepare(`
      SELECT * FROM leads 
      WHERE archived = 0 
      ORDER BY updated_at DESC
    `).all();

    const dossiers = sqlite.prepare(`SELECT * FROM diagnostic_dossiers`).all();
    const handoverSpecs = sqlite.prepare(`SELECT * FROM deal_handover_specs`).all();
    const buildLogs = sqlite.prepare(`SELECT * FROM project_build_logs ORDER BY created_at ASC`).all();
    const drafts = sqlite.prepare(`SELECT * FROM outreach_drafts ORDER BY created_at DESC`).all();

    return NextResponse.json({
      leads,
      dossiers,
      handoverSpecs,
      buildLogs,
      drafts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit || 3);

    const result = await scoutAgent.run(limit);

    // Queue audit for each discovered lead
    for (const lead of result.insertedLeads) {
      await agentMultiplexer.enqueueJob('AUDIT_LEAD', lead.id, {}, 1);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
