import { NextResponse } from 'next/server';
import { auditorAgent } from '@/agents/auditor';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const dossier = await auditorAgent.auditLead(leadId);
    return NextResponse.json({ success: true, dossier });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
