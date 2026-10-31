import { getDb, getSqlite } from './index';
import { leads, diagnosticDossiers, messages, dealHandoverSpecs, projectBuildLogs } from './schema';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export async function seedInitialPipelineIfNeeded() {
  const sqlite = getSqlite();
  const db = getDb();

  const countRow = sqlite.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
  if (countRow && countRow.count > 0) {
    return; // Already seeded
  }

  console.log('[Seed] Seeding realistic local leads and active pipeline stages...');
  const now = new Date();
  const isoNow = now.toISOString();

  // 1. Lead in waiting_human_closer (Reunião agendada & Trava Humana)
  const lead1Id = 'lead_odonto_01';
  const meetingDate = new Date(now.getTime() + 24 * 3600 * 1000);
  meetingDate.setHours(14, 30, 0, 0);

  await db.insert(leads).values({
    id: lead1Id,
    companyName: 'Clínica OdontoVale Ltda',
    tradeName: 'OdontoVale Itajubá',
    decisionMakerName: 'Dr. Lucas Alvarenga',
    cnpj: '45.123.890/0001-12',
    segment: 'clinica',
    city: 'Itajubá - MG',
    phone: '5512991234567',
    website: 'https://odontovaleitajuba.com.br',
    mapsUrl: 'https://maps.google.com/?cid=1029384756',
    icpScore: 92,
    leadStatus: 'waiting_human_closer',
    channelState: 'human_locked',
    activeAgent: null,
    activeAgentStatus: '🔒 Trava humana ativa: reunião agendada no Google Calendar',
    primaryBottleneck: 'Perda de consultas por falta de confirmação ativa (No-Show) e sobrecarga na recepção',
    estimatedMonthlyLoss: 4500,
    scheduledCalendarTime: meetingDate.toISOString(),
    scheduledCalendarEventId: 'meet_event_123',
    googleMeetUrl: 'https://meet.google.com/leg-val-meet',
    createdAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
    updatedAt: isoNow,
  });

  await db.insert(diagnosticDossiers).values({
    id: crypto.randomUUID(),
    leadId: lead1Id,
    digitalPresence: JSON.stringify({ website: true, metaPixel: false, googleTag: false }),
    reviewsSummary: JSON.stringify({
      evidence: 'Avaliação de 2 estrelas no Maps: "Mandei mensagem 9h para confirmar horário e ninguém me respondeu até o fim do dia."',
    }),
    primaryBottleneck: 'Perda de consultas por falta de confirmação ativa (No-Show) e sobrecarga na recepção',
    secondaryBottlenecks: JSON.stringify([
      'Falta de visão diária de ticket médio por procedimento',
      'Atendimento no WhatsApp sem fila única',
    ]),
    financialLossEstimate: 4500,
    conservativeRoi: 'Recuperando apenas 3 a 4 consultas/mês o sistema já gera lucro líquido positivo.',
    recommendedStack: JSON.stringify([
      'Kanban WhatsApp de Atendimento',
      'Lembretes Automáticos Anti-No-Show',
      'Dashboard BI de Faturamento e Procedimentos',
    ]),
    createdAt: new Date(now.getTime() - 40 * 3600 * 1000).toISOString(),
  });

  // Conversation history for Lead 1
  const msgs1 = [
    { sender: 'ai_sdr', dir: 'outbound', text: 'Dr. Lucas, tudo bem? Vi o atendimento da OdontoVale aqui em Itajubá.' },
    { sender: 'ai_sdr', dir: 'outbound', text: 'Notamos que clínicas na região perdem cerca de R$ 4k/mês com faltas de pacientes no WhatsApp. Implantamos CRM com lembrete automático e painel de BI.' },
    { sender: 'ai_sdr', dir: 'outbound', text: 'Vocês hoje usam algum sistema de confirmação ou controlam na planilha/no braço?' },
    { sender: 'lead', dir: 'inbound', text: 'Olá! A secretária anota na agenda física e no WhatsApp, mas realmente muita gente falta ou esquece de vir.' },
    { sender: 'ai_sdr', dir: 'outbound', text: 'Compreendo perfeitamente, Dr. Lucas. Essa correria entre atender paciente e responder WhatsApp na recepção é o que mais drena receita. Nosso painel centraliza todas as conversas em Kanban e avisa o paciente 24h antes.' },
    { sender: 'lead', dir: 'inbound', text: 'Interessante! Quanto custa a implantação e como funciona? Poderíamos marcar uma conversa rápida?' },
    { sender: 'ai_sdr', dir: 'outbound', text: 'Perfeito! Para entender o detalhe da sua rotina e passar os valores exatos de setup e mensalidade, o Gabriel Valença (nosso Engenheiro e Diretor de Projetos) vai falar com você diretamente por aqui agora. Agendamos para amanhã às 14:30!' },
  ];

  for (let i = 0; i < msgs1.length; i++) {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      leadId: lead1Id,
      direction: msgs1[i].dir,
      sender: msgs1[i].sender,
      content: msgs1[i].text,
      mediaType: 'text',
      createdAt: new Date(now.getTime() - (20 - i) * 3600 * 1000).toISOString(),
    });
  }

  // 2. Lead in qualifying (SPIN Selling em andamento)
  const lead2Id = 'lead_burguer_02';
  await db.insert(leads).values({
    id: lead2Id,
    companyName: 'Burgueria do Vale Artesanal Eireli',
    tradeName: 'Burgueria do Vale',
    decisionMakerName: 'Marcelo Castro',
    cnpj: '33.987.654/0001-99',
    segment: 'restaurante',
    city: 'Itajubá - MG',
    phone: '5512997654321',
    website: 'https://linktr.ee/burgueriadovale',
    mapsUrl: 'https://maps.google.com/?cid=9876543210',
    icpScore: 88,
    leadStatus: 'qualifying',
    channelState: 'ai_active',
    activeAgent: 'SdrAgent',
    activeAgentStatus: 'SdrAgent conduzindo qualificação SPIN (implicação de taxas do iFood)',
    primaryBottleneck: 'Dependência excessiva de iFood pagando 23% de taxas por falta de canal próprio ágil no WhatsApp',
    estimatedMonthlyLoss: 3800,
    createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    updatedAt: isoNow,
  });

  await db.insert(diagnosticDossiers).values({
    id: crypto.randomUUID(),
    leadId: lead2Id,
    digitalPresence: JSON.stringify({ website: false, linktree: true, ifood: true }),
    reviewsSummary: JSON.stringify({
      evidence: 'No sábado à noite mandei mensagem no WhatsApp e demoraram 40 minutos para mandar o cardápio.',
    }),
    primaryBottleneck: 'Dependência excessiva de iFood pagando 23% de taxas por falta de canal próprio ágil no WhatsApp',
    secondaryBottlenecks: JSON.stringify(['Falta de controle de CMV por lanche', 'Demora de resposta no pico de sábado']),
    financialLossEstimate: 3800,
    conservativeRoi: 'Migrando 20% dos clientes fiéis do iFood para o WhatsApp direto, a economia passa de R$ 3.000/mês.',
    recommendedStack: JSON.stringify(['Cardápio Digital no WhatsApp', 'Controle de CMV & Painel BI de Margem']),
    createdAt: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
  });

  // 3. Lead in audited (Diagnosticado BI/CRM)
  const lead3Id = 'lead_dermato_03';
  await db.insert(leads).values({
    id: lead3Id,
    companyName: 'DermatoClínica Sul de Minas Ltda',
    tradeName: 'DermatoClínica Pouso Alegre',
    decisionMakerName: 'Dra. Camila Toledo',
    cnpj: '18.456.789/0001-44',
    segment: 'clinica',
    city: 'Pouso Alegre - MG',
    phone: '5535998112233',
    website: 'https://dermatoclinicasuldeminas.com.br',
    mapsUrl: 'https://maps.google.com/?cid=5544332211',
    icpScore: 90,
    leadStatus: 'audited',
    channelState: 'ai_active',
    activeAgent: 'AuditorAgent',
    activeAgentStatus: 'Dossiê concluído: perda estimada de R$ 5.200/mês',
    primaryBottleneck: 'Leads de procedimentos estéticos caros esfriando no WhatsApp sem régua de follow-up',
    estimatedMonthlyLoss: 5200,
    createdAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    updatedAt: isoNow,
  });

  // 4. Lead in discovered (Descoberto)
  const lead4Id = 'lead_mecanica_04';
  await db.insert(leads).values({
    id: lead4Id,
    companyName: 'AutoPeças & Mecânica Central Sul Ltda',
    tradeName: 'Mecânica Central',
    decisionMakerName: 'Rogério Andrade',
    cnpj: '22.333.444/0001-55',
    segment: 'comercio',
    city: 'Itajubá - MG',
    phone: '5512993445566',
    icpScore: 78,
    leadStatus: 'discovered',
    channelState: 'whatsapp_pending_validation',
    activeAgent: 'ScoutAgent',
    activeAgentStatus: 'Validado na Evolution API. Aguardando auditoria',
    primaryBottleneck: null,
    createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    updatedAt: isoNow,
  });

  // 5. Lead in delivered (Software já entregue em projects/odontovale-itajuba)
  const lead5Id = 'lead_delivered_05';
  await db.insert(leads).values({
    id: lead5Id,
    companyName: 'Bella Donna Estética & Spa Ltda',
    tradeName: 'Bella Donna Spa',
    decisionMakerName: 'Juliana Ferreira',
    cnpj: '29.777.888/0001-33',
    segment: 'clinica',
    city: 'Pouso Alegre - MG',
    phone: '5535991447788',
    icpScore: 94,
    leadStatus: 'delivered',
    channelState: 'completed',
    activeAgent: null,
    activeAgentStatus: '✅ Sistema pronto e entregue em projects/bella-donna-spa',
    primaryBottleneck: 'Falta de confirmação de pacotes e desorganização de agenda',
    estimatedMonthlyLoss: 3900,
    createdAt: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
    updatedAt: isoNow,
  });

  await db.insert(dealHandoverSpecs).values({
    id: crypto.randomUUID(),
    leadId: lead5Id,
    projectSlug: 'bella-donna-spa',
    clientTradeName: 'Bella Donna Spa',
    niche: 'clinica',
    agreedSetupPrice: 3800,
    agreedMonthlyPrice: 650,
    requestedFeatures: JSON.stringify([
      'Kanban de Atendimento WhatsApp',
      'Automação de Lembretes Anti-No-Show',
      'Dashboard BI de Faturamento em Tempo Real',
    ]),
    specialInstructions: 'Integrar canal de atendimento sem migrar o chip físico.',
    confirmedByOperator: 1,
    confirmedAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
  });

  // Ensure files in projects/bella-donna-spa exist
  const clientDir = path.resolve(process.cwd(), 'projects/bella-donna-spa');
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(path.join(clientDir, 'src/bi'), { recursive: true });
    fs.writeFileSync(path.join(clientDir, 'PRD.md'), '# PRD — Bella Donna Spa LegenTech CRM & BI\n');
    fs.writeFileSync(path.join(clientDir, 'CLAUDE.md'), '# CLAUDE.md — Bella Donna Spa Guidelines\n');
  }

  const logs5 = [
    { step: 'PRD', pct: 20, msg: 'PRD.md e CLAUDE.md gerados' },
    { step: 'DATABASE', pct: 40, msg: 'Banco de dados e schemas criados' },
    { step: 'BACKEND_BI', pct: 70, msg: 'Rotas de API e dashboard de BI implementados' },
    { step: 'TESTS_BUILD', pct: 90, msg: 'Build e checagem de tipos 100% aprovados' },
    { step: 'DELIVERED', pct: 100, msg: 'Sistema entregue com sucesso em projects/bella-donna-spa' },
  ];

  for (const log of logs5) {
    await db.insert(projectBuildLogs).values({
      id: crypto.randomUUID(),
      leadId: lead5Id,
      stepName: log.step,
      progressPercent: log.pct,
      status: 'completed',
      message: log.msg,
      createdAt: isoNow,
    });
  }

  console.log('[Seed] Seeding completed successfully!');
}
