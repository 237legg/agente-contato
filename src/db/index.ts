import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';

let sqliteDbInstance: InstanceType<typeof Database> | null = null;
let drizzleDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabasePath(): string {
  const envPath = process.env.DATABASE_URL;
  if (envPath && envPath.startsWith('file:')) {
    return path.resolve(process.cwd(), envPath.replace('file:', ''));
  }
  if (envPath) {
    return path.resolve(process.cwd(), envPath);
  }
  return path.resolve(process.cwd(), 'data/legentech.db');
}

export function initializeDatabase(dbPath?: string) {
  const targetPath = dbPath || getDatabasePath();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(targetPath);
  // Enable WAL mode for high concurrency
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  // Execute schema bootstrap
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      trade_name TEXT,
      decision_maker_name TEXT,
      cnpj TEXT UNIQUE,
      segment TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      website TEXT,
      maps_url TEXT,
      icp_score INTEGER DEFAULT 0 NOT NULL,
      lead_status TEXT DEFAULT 'discovered' NOT NULL,
      channel_state TEXT DEFAULT 'whatsapp_pending_validation' NOT NULL,
      active_agent TEXT,
      active_agent_status TEXT,
      primary_bottleneck TEXT,
      estimated_monthly_loss REAL,
      scheduled_calendar_time TEXT,
      scheduled_calendar_event_id TEXT,
      google_meet_url TEXT,
      archived INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagnostic_dossiers (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      digital_presence TEXT NOT NULL,
      reviews_summary TEXT NOT NULL,
      primary_bottleneck TEXT NOT NULL,
      secondary_bottlenecks TEXT NOT NULL,
      financial_loss_estimate REAL NOT NULL,
      conservative_roi TEXT NOT NULL,
      recommended_stack TEXT NOT NULL,
      critic_score INTEGER,
      critic_feedback TEXT,
      raw_data TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outreach_drafts (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      iteration INTEGER DEFAULT 1 NOT NULL,
      bubble_1 TEXT NOT NULL,
      bubble_2 TEXT NOT NULL,
      bubble_3 TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      critic_approved INTEGER DEFAULT 0 NOT NULL,
      critic_rejection_reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      direction TEXT NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'text' NOT NULL,
      media_url TEXT,
      audio_transcription TEXT,
      evolution_message_id TEXT UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deal_handover_specs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id),
      project_slug TEXT NOT NULL,
      client_trade_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      agreed_setup_price REAL,
      agreed_monthly_price REAL,
      requested_features TEXT NOT NULL,
      special_instructions TEXT,
      confirmed_by_operator INTEGER DEFAULT 1 NOT NULL,
      confirmed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_build_logs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      step_name TEXT NOT NULL,
      progress_percent INTEGER DEFAULT 0 NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      artifact_path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs_queue (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      lead_id TEXT REFERENCES leads(id),
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      run_at TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0 NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_calls (
      id TEXT PRIMARY KEY,
      agent_name TEXT NOT NULL,
      lead_id TEXT REFERENCES leads(id),
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0 NOT NULL,
      output_tokens INTEGER DEFAULT 0 NOT NULL,
      latency_ms INTEGER DEFAULT 0 NOT NULL,
      cost_usd REAL DEFAULT 0 NOT NULL,
      purpose TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS do_not_contact (
      phone TEXT PRIMARY KEY,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
    CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel_state);
    CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status_run ON jobs_queue(status, run_at);
  `);

  sqliteDbInstance = sqlite;
  drizzleDbInstance = drizzle(sqlite, { schema });
  return { sqlite, db: drizzleDbInstance };
}

export function getDb() {
  if (!drizzleDbInstance) {
    initializeDatabase();
  }
  return drizzleDbInstance!;
}

export function getSqlite() {
  if (!sqliteDbInstance) {
    initializeDatabase();
  }
  return sqliteDbInstance!;
}
