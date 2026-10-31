import { NextResponse } from 'next/server';
import { architectAgent } from '@/agents/architect';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const result = await architectAgent.buildProject(leadId);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
