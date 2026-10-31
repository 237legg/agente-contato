# Skill: Agendamento no Google Calendar e Handoff Humano

## Objetivo
Consultar disponibilidade de agenda com base nas regras de negócio e realizar o agendamento de reuniões de fechamento ou enviar o link direto do Google Calendar, pausando o agente e acionando Gabriel Valença.

## Regras de Execução:
1. **Consulta de Horários:**
   - Buscar horários livres nos próximos 3 dias úteis dentro de `OPERATING_HOURS` (08:30 às 18:30).
   - Oferecer sempre 2 opções específicas para reduzir atrito: "Tenho amanhã às 14:30 ou quinta às 10:00. Algum desses fica bom pra você?".
   - Como alternativa rápida, enviar o link direto de agendamento: `GOOGLE_CALENDAR_LINK`.

2. **Criação do Evento:**
   - Ao confirmar horário, criar evento no Google Calendar via API / integração com título: `[LegenTech] Diagnóstico BI & CRM - {Empresa} x Gabriel Valença`.
   - Adicionar link do Google Meet e descrição com resumo das dores.

3. **Gatilho de Handoff Imediato (`waiting_human_closer`):**
   - Transicionar o status do canal para `human_locked`.
   - Mover o card para `Aguardando Você Fechar`.
   - Disparar WhatsApp para `OWNER_PERSONAL_WHATSAPP` (5512997082889):
     `🚨 REUNIÃO AGENDADA / CLIENTE QUALIFICADO: {Nome} da {Empresa}. Horário: {Horário}. Link da conversa: {ChatUrl}`.
