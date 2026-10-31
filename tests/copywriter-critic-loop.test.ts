import { describe, it, expect } from 'vitest';
import { criticAgent } from '@/agents/critic';

describe('4. CopywriterAgent and CriticAgent Reflection Loop', () => {
  it('rejects copy that exceeds 50 words', () => {
    const longBubble2 = 'Aqui na nossa empresa desenvolvemos soluções tecnológicas avançadas de ponta a ponta para que você consiga transformar radicalmente todos os seus processos internos e otimizar absolutamente tudo com alta sinergia e resultados extraordinários no mercado nacional.'.repeat(2);

    const evaluation = criticAgent.evaluateDraft([
      'Olá Dr. Carlos, tudo bem?',
      longBubble2,
      'Como vocês fazem o controle hoje?',
    ]);

    expect(evaluation.approved).toBe(false);
    expect(evaluation.wordCount).toBeGreaterThan(50);
    expect(evaluation.rejectionReason).toContain('Texto longo demais');
  });

  it('rejects copy with forbidden robotic AI jargon', () => {
    const evaluation = criticAgent.evaluateDraft([
      'Espero que esteja bem! Vi sua empresa no Maps.',
      'Gostaria de revolucionar seu atendimento e alavancar o faturamento.',
      'Podemos agendar 15 minutos do seu tempo?',
    ]);

    expect(evaluation.approved).toBe(false);
    expect(evaluation.rejectionReason).toContain('jargão robótico');
  });

  it('approves copy that is concise, human, and under 50 words', () => {
    const evaluation = criticAgent.evaluateDraft([
      'Carlos, tudo bem? Vi a movimentação da clínica em Itajubá.',
      'Notamos perda com faltas de pacientes no WhatsApp. Implantamos CRM com lembrete automático e painel de BI.',
      'Vocês controlam isso em planilha hoje?',
    ]);

    expect(evaluation.approved).toBe(true);
    expect(evaluation.wordCount).toBeLessThanOrEqual(50);
    expect(evaluation.score).toBeGreaterThanOrEqual(90);
  });
});
