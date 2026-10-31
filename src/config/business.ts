import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const BusinessConfigSchema = z.object({
  OWNER_NAME: z.string().min(1),
  OWNER_ROLE: z.string().min(1),
  OWNER_PERSONAL_WHATSAPP: z.string().min(8),
  COMPANY_NAME: z.string().min(1),
  COMPANY_WEBSITE: z.string().min(1),
  EVOLUTION_INSTANCE_NAME: z.string().min(1),
  GOOGLE_CALENDAR_ID: z.string().min(1),
  GOOGLE_CALENDAR_LINK: z.string().min(1),
  ONE_LINE_PITCH: z.string().min(1),
  HOW_IT_WORKS: z.array(z.string()).min(1),
  REVENUE_MODEL: z.string().min(1),
  MARKET_JARGON: z.record(z.string(), z.string()),
  VERIFIED_CLAIMS: z.array(z.string()).min(1),
  UNVERIFIED_CLAIMS: z.array(z.string()).min(1),
  ICP_SEGMENTS: z.array(z.string()).min(1),
  ICP_KEYWORDS: z.array(z.string()).min(1),
  GEOGRAPHY: z.array(z.string()).min(1),
});

export type BusinessConfig = z.infer<typeof BusinessConfigSchema>;

let cachedConfig: BusinessConfig | null = null;

export function getBusinessConfig(): BusinessConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.resolve(process.cwd(), 'config/business.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Business configuration file not found at ${configPath}. Please check config/business.json.`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  cachedConfig = BusinessConfigSchema.parse(parsed);
  return cachedConfig;
}
