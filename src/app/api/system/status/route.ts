import { NextResponse } from 'next/server';
import { getSqlite } from '@/db';
import { agentMultiplexer } from '@/worker/multiplexer';
import { getBusinessConfig } from '@/config/business';

export async function GET() {
  try {
    const sqlite = getSqlite();
    const config = getBusinessConfig();

    const poolStatus = agentMultiplexer.getStatus();

    // Summary counts
    const totalLeads = (sqlite.prepare('SELECT COUNT(*) as c FROM leads WHERE archived = 0').get() as any)?.c || 0;
    const discovered = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'discovered'").get() as any)?.c || 0;
    const audited = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'audited'").get() as any)?.c || 0;
    const contacted = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'contacted'").get() as any)?.c || 0;
    const replied = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'replied'").get() as any)?.c || 0;
    const qualifying = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'qualifying'").get() as any)?.c || 0;
    const waitingHuman = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'waiting_human_closer'").get() as any)?.c || 0;
    const inDevelopment = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'in_development'").get() as any)?.c || 0;
    const delivered = (sqlite.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status = 'delivered'").get() as any)?.c || 0;

    // Financial pipeline stats
    const totalSetupSold = (
      sqlite.prepare('SELECT COALESCE(SUM(agreed_setup_price), 0) as s FROM deal_handover_specs').get() as any
    )?.s || 0;

    const totalMonthlySold = (
      sqlite.prepare('SELECT COALESCE(SUM(agreed_monthly_price), 0) as m FROM deal_handover_specs').get() as any
    )?.m || 0;

    // AI costs by agent
    const aiCostsByAgent = sqlite.prepare(`
      SELECT 
        agent_name, 
        COUNT(*) as total_calls, 
        COALESCE(SUM(cost_usd), 0) as cost_usd,
        COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
      FROM ai_calls 
      GROUP BY agent_name
    `).all();

    const totalAiCost = (
      sqlite.prepare('SELECT COALESCE(SUM(cost_usd), 0) as total FROM ai_calls').get() as any
    )?.total || 0;

    return NextResponse.json({
      config: {
        companyName: config.COMPANY_NAME,
        ownerName: config.OWNER_NAME,
        ownerRole: config.OWNER_ROLE,
        ownerPhone: config.OWNER_PERSONAL_WHATSAPP,
        calendarLink: config.GOOGLE_CALENDAR_LINK,
      },
      poolStatus,
      metrics: {
        totalLeads,
        discovered,
        audited,
        contacted,
        replied,
        qualifying,
        waitingHuman,
        inDevelopment,
        delivered,
        totalSetupSold,
        totalMonthlySold,
        totalAiCost,
        budgetLimitUsd: Number(process.env.MONTHLY_AI_BUDGET_USD || '50.00'),
      },
      aiCostsByAgent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
