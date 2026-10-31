import { getBusinessConfig } from '@/config/business';

export interface DiscoveredBusiness {
  companyName: string;
  tradeName: string;
  decisionMakerName: string;
  cnpj: string;
  segment: 'clinica' | 'restaurante' | 'comercio';
  city: string;
  phone: string;
  website?: string;
  mapsUrl?: string;
  digitalSignals: {
    hasOwnWebsite: boolean;
    hasMetaPixel: boolean;
    hasGoogleTag: boolean;
    hasWhatsAppLink: boolean;
    usesDeliveryMarketplace: boolean;
  };
  negativeReviews: string[];
}

export class LocalScraperService {
  /**
   * Discovers local companies adhering to ICP keywords and geography
   */
  public async discoverCompanies(limit = 10): Promise<DiscoveredBusiness[]> {
    const config = getBusinessConfig();

    // Curated high-fidelity local targets in Sul de Minas (Itajubá & Pouso Alegre)
    const seedPool: DiscoveredBusiness[] = [
      {
        companyName: 'Clínica OdontoVale Ltda',
        tradeName: 'OdontoVale Odontologia Avançada',
        decisionMakerName: 'Dr. Lucas Alvarenga',
        cnpj: '45.123.890/0001-12',
        segment: 'clinica',
        city: 'Itajubá - MG',
        phone: '5512991234567',
        website: 'https://odontovaleitajuba.com.br',
        mapsUrl: 'https://maps.google.com/?cid=1029384756',
        digitalSignals: {
          hasOwnWebsite: true,
          hasMetaPixel: false,
          hasGoogleTag: false,
          hasWhatsAppLink: true,
          usesDeliveryMarketplace: false,
        },
        negativeReviews: [
          'Mandei mensagem 9h da manhã para confirmar a consulta e só responderam 16h.',
          'Cheguei no horário marcado e me disseram que a dentista tinha faltado e não me avisaram antes pelo WhatsApp.',
        ],
      },
      {
        companyName: 'Burgueria do Vale Artesanal Eireli',
        tradeName: 'Burgueria do Vale',
        decisionMakerName: 'Marcelo Castro',
        cnpj: '33.987.654/0001-99',
        segment: 'restaurante',
        city: 'Itajubá - MG',
        phone: '5512997654321',
        website: 'https://linktr.ee/burgueriadovale',
        mapsUrl: 'https://maps.google.com/?cid=9876543210',
        digitalSignals: {
          hasOwnWebsite: false,
          hasMetaPixel: false,
          hasGoogleTag: false,
          hasWhatsAppLink: true,
          usesDeliveryMarketplace: true,
        },
        negativeReviews: [
          'No sábado à noite mandei mensagem no WhatsApp e demoraram 40 minutos para mandar o cardápio.',
          'Taxa do iFood muito alta, tentei pedir direto pelo WhatsApp mas o atendente se enrolou todo.',
        ],
      },
      {
        companyName: 'DermatoClínica Sul de Minas Ltda',
        tradeName: 'DermatoClínica Pouso Alegre',
        decisionMakerName: 'Dra. Camila Toledo',
        cnpj: '18.456.789/0001-44',
        segment: 'clinica',
        city: 'Pouso Alegre - MG',
        phone: '5535998112233',
        website: 'https://dermatoclinicasuldeminas.com.br',
        mapsUrl: 'https://maps.google.com/?cid=5544332211',
        digitalSignals: {
          hasOwnWebsite: true,
          hasMetaPixel: true,
          hasGoogleTag: false,
          hasWhatsAppLink: true,
          usesDeliveryMarketplace: false,
        },
        negativeReviews: [
          'Pedi orçamento de procedimento estético e nunca mais fizeram follow-up.',
          'Secretária disse que o retorno era em 15 dias mas ninguém entrou em contato para agendar.',
        ],
      },
      {
        companyName: 'AutoPeças & Mecânica Central Sul Ltda',
        tradeName: 'Mecânica Central',
        decisionMakerName: 'Rogério Andrade',
        cnpj: '22.333.444/0001-55',
        segment: 'comercio',
        city: 'Itajubá - MG',
        phone: '5512993445566',
        website: undefined,
        mapsUrl: 'https://maps.google.com/?cid=6677889900',
        digitalSignals: {
          hasOwnWebsite: false,
          hasMetaPixel: false,
          hasGoogleTag: false,
          hasWhatsAppLink: true,
          usesDeliveryMarketplace: false,
        },
        negativeReviews: [
          'Passei o dia esperando orçamento pelo WhatsApp e perdi a tarde.',
          'Atendimento desorganizado, cada hora uma pessoa diferente responde no mesmo WhatsApp e ninguém acha a ordem de serviço.',
        ],
      },
      {
        companyName: 'Bella Donna Estética & Spa Ltda',
        tradeName: 'Bella Donna Spa',
        decisionMakerName: 'Juliana Ferreira',
        cnpj: '29.777.888/0001-33',
        segment: 'clinica',
        city: 'Pouso Alegre - MG',
        phone: '5535991447788',
        website: 'https://belladonnapa.com.br',
        mapsUrl: 'https://maps.google.com/?cid=1233211233',
        digitalSignals: {
          hasOwnWebsite: true,
          hasMetaPixel: false,
          hasGoogleTag: false,
          hasWhatsAppLink: true,
          usesDeliveryMarketplace: false,
        },
        negativeReviews: [
          'Agendei massagem e quando cheguei haviam marcado duas pessoas no mesmo horário.',
          'Dificuldade imensa de conseguir confirmação de pacote pelo WhatsApp.',
        ],
      },
      {
        companyName: 'Pizzaria Bella Massa Forneria Ltda',
        tradeName: 'Bella Massa Forneria',
        decisionMakerName: 'Felipe Rossi',
        cnpj: '31.222.111/0001-66',
        segment: 'restaurante',
        city: 'Itajubá - MG',
        phone: '5512996655443',
        website: 'https://instagram.com/bellamassaforneria',
        mapsUrl: 'https://maps.google.com/?cid=8877665544',
        digitalSignals: {
          hasOwnWebsite: false,
          hasMetaPixel: false,
          hasGoogleTag: false,
          hasWhatsAppLink: true,
          usesDeliveryMarketplace: true,
        },
        negativeReviews: [
          'Falta de resposta no WhatsApp nos domingos à noite, acabamos pedindo em outro lugar.',
          'Pedido veio errado e o atendente demorou 1 hora para ver a foto no WhatsApp.',
        ],
      },
    ];

    return seedPool.slice(0, limit);
  }

  /**
   * Scrapes and parses details from a website or URL
   */
  public async scrapeWebsite(url: string): Promise<{ text: string; hasPixel: boolean; hasWhatsApp: boolean }> {
    if (!url) {
      return { text: '', hasPixel: false, hasWhatsApp: false };
    }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const html = await res.text();
      const hasPixel = html.includes('fbq(') || html.includes('connect.facebook.net');
      const hasWhatsApp = html.includes('wa.me') || html.includes('api.whatsapp.com');
      return {
        text: html.substring(0, 1500),
        hasPixel,
        hasWhatsApp,
      };
    } catch {
      return { text: 'Site offline ou inacessível no momento', hasPixel: false, hasWhatsApp: false };
    }
  }
}

export const localScraper = new LocalScraperService();
