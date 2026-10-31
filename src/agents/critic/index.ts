import { z } from 'zod';
import { getBusinessConfig } from '@/config/business';

export const CriticEvaluationSchema = z.object({
  approved: z.boolean(),
  score: z.number().min(0).max(100),
  wordCount: z.number(),
  rejectionReason: z.string().optional(),
  feedback: z.string(),
});

export type CriticEvaluation = z.infer<typeof CriticEvaluationSchema>;

export class CriticAgent {
  public static readonly AGENT_NAME = 'CriticAgent';

  public static readonly FORBIDDEN_JARGON = [
    'espero que esteja bem',
    'espero que esta mensagem',
    'tudo bem com você',
    'gostaria de apresentar',
    'revolucionar',
    'revolucionário',
    'alavancar',
    'alavancagem',
    'sinergia',
    'otimizar ao máximo',
    'transformação digital',
    'solução ponta a ponta',
    '15 minutos do seu tempo',
  ];

  public evaluateDraft(bubbles: [string, string, string]): CriticEvaluation {
    const config = getBusinessConfig();
    const fullText = bubbles.join(' ').trim();
    const words = fullText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const lowerText = fullText.toLowerCase();

    // 1. Check max word count (Strict: <= 50 words)
    if (wordCount > 50) {
      return {
        approved: false,
        score: 40,
        wordCount,
        rejectionReason: `Texto longo demais (${wordCount} palavras). O limite máximo estrito é de 50 palavras somando os 3 balões.`,
        feedback: 'Encurte as frases e vá direto ao ponto sem introduções desnecessárias.',
      };
    }

    // 2. Check forbidden robotic AI jargon
    for (const jargon of CriticAgent.FORBIDDEN_JARGON) {
      if (lowerText.includes(jargon)) {
        return {
          approved: false,
          score: 30,
          wordCount,
          rejectionReason: `Presença de jargão robótico proibido: "${jargon}".`,
          feedback: 'Elimine clichês de IA. Fale como um engenheiro/parceiro direto em conversa de WhatsApp comercial.',
        };
      }
    }

    // 3. Check for unverified claims
    for (const unverified of config.UNVERIFIED_CLAIMS) {
      if (lowerText.includes(unverified.toLowerCase())) {
        return {
          approved: false,
          score: 20,
          wordCount,
          rejectionReason: `Uso de alegação não permitida: "${unverified}".`,
          feedback: 'Utilize apenas os benefícios reais comprovados em VERIFIED_CLAIMS.',
        };
      }
    }

    // 4. Validate bubble structure
    if (!bubbles[0] || !bubbles[1] || !bubbles[2]) {
      return {
        approved: false,
        score: 45,
        wordCount,
        rejectionReason: 'A abordagem deve ter exatamente 3 balões curtos.',
        feedback: 'Forneça balão 1 (quebra de gelo), balão 2 (gargalo + valor) e balão 3 (pergunta aberta).',
      };
    }

    return {
      approved: true,
      score: 95,
      wordCount,
      feedback: 'Texto aprovado: humano, conciso, focado na dor real e dentro do limite de 50 palavras.',
    };
  }
}

export const criticAgent = new CriticAgent();
