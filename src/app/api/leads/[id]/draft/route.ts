import { NextResponse } from 'next/server';
import { copywriterAgent } from '@/agents/copywriter';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const output = await copywriterAgent.generateOutreach(leadId);
    return NextResponse.json({ success: true, output });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
