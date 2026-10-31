import { NextResponse } from 'next/server';
import { whatsappWebhookHandler } from '@/features/conversations/webhook-handler';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await whatsappWebhookHandler.handleWebhookEvent(body);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Evolution webhook endpoint active' });
}
