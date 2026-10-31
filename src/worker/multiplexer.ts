import { getDb, getSqlite } from '@/db';
import { jobsQueue, leads } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { scoutAgent } from '@/agents/scout';
import { auditorAgent } from '@/agents/auditor';
import { copywriterAgent } from '@/agents/copywriter';
import { sdrAgent } from '@/agents/sdr';
import { architectAgent } from '@/agents/architect';
import { evolutionClient } from '@/integrations/evolution-whatsapp/client';
import { checkMonthlyBudgetExceeded } from '@/integrations/llm/router';
import crypto from 'node:crypto';

export type JobType =
  | 'SCOUT_DISCOVER'
  | 'AUDIT_LEAD'
  | 'DRAFT_COPY'
  | 'SEND_OUTREACH'
  | 'PROCESS_INBOUND_DEBOUNCED'
  | 'SCHEDULE_CALENDAR'
  | 'BUILD_CLIENT_SYSTEM';

export interface PoolStatus {
  discovery: { active: boolean; currentJob?: string };
  whatsappRealtime: { active: boolean; currentJob?: string };
  softwareFactory: { active: boolean; currentJob?: string };
  budgetExceeded: boolean;
  totalSpentUsd: number;
}

export class AgentMultiplexer {
  private isRunning = false;
  private loopInterval: NodeJS.Timeout | null = null;

  // Active locks per lead to guarantee no concurrent collisions
  private leadLocks = new Set<string>();

  // State indicators for UI streaming
  private status: PoolStatus = {
    discovery: { active: false },
    whatsappRealtime: { active: false },
    softwareFactory: { active: false },
    budgetExceeded: false,
    totalSpentUsd: 0,
  };

  public getStatus(): PoolStatus {
    return { ...this.status };
  }

  public async enqueueJob(type: JobType, leadId?: string, payload: Record<string, any> = {}, delaySeconds = 0): Promise<string> {
    const db = getDb();
    const jobId = crypto.randomUUID();
    const now = new Date();
    const runAt = new Date(now.getTime() + delaySeconds * 1000).toISOString();

    await db.insert(jobsQueue).values({
      id: jobId,
      jobType: type,
      leadId: leadId || null,
      payload: JSON.stringify(payload),
      status: 'pending',
      runAt,
      retryCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return jobId;
  }

  public async runDiscoveryPool(): Promise<void> {
    if (this.status.discovery.active) return;
    this.status.discovery.active = true;

    try {
      const sqlite = getSqlite();
      const nowIso = new Date().toISOString();

      // Check for pending SCOUT or AUDIT jobs
      const job = sqlite
        .prepare(`
          SELECT * FROM jobs_queue 
          WHERE status = 'pending' 
            AND job_type IN ('SCOUT_DISCOVER', 'AUDIT_LEAD') 
            AND run_at <= ? 
          ORDER BY run_at ASC 
          LIMIT 1
        `)
        .get(nowIso) as any;

      if (!job) {
        this.status.discovery.active = false;
        return;
      }

      if (job.lead_id && this.leadLocks.has(job.lead_id)) {
        this.status.discovery.active = false;
        return;
      }

      if (job.lead_id) this.leadLocks.add(job.lead_id);
      this.status.discovery.currentJob = `${job.job_type} (${job.lead_id || 'new'})`;

      // Mark job running
      sqlite.prepare("UPDATE jobs_queue SET status = 'running', updated_at = ? WHERE id = ?").run(nowIso, job.id);

      if (job.job_type === 'SCOUT_DISCOVER') {
        const result = await scoutAgent.run(2);
        // Automatically queue audit for each newly discovered lead
        for (const item of result.insertedLeads) {
          await this.enqueueJob('AUDIT_LEAD', item.id, {}, 1);
        }
      } else if (job.job_type === 'AUDIT_LEAD' && job.lead_id) {
        await auditorAgent.auditLead(job.lead_id);
        // Automatically queue copy generation
        await this.enqueueJob('DRAFT_COPY', job.lead_id, {}, 2);
      }

      // Mark job completed
      sqlite.prepare("UPDATE jobs_queue SET status = 'completed', updated_at = ? WHERE id = ?").run(new Date().toISOString(), job.id);
      if (job.lead_id) this.leadLocks.delete(job.lead_id);
    } catch (err: any) {
      console.error('[DiscoveryPool Error]:', err);
    } finally {
      this.status.discovery.active = false;
      this.status.discovery.currentJob = undefined;
    }
  }

  public async runWhatsAppRealtimePool(): Promise<void> {
    if (this.status.whatsappRealtime.active) return;
    this.status.whatsappRealtime.active = true;

    try {
      const sqlite = getSqlite();
      const nowIso = new Date().toISOString();

      // Check for pending copy, outbound or debounced inbound jobs
      const job = sqlite
        .prepare(`
          SELECT * FROM jobs_queue 
          WHERE status = 'pending' 
            AND job_type IN ('DRAFT_COPY', 'SEND_OUTREACH', 'PROCESS_INBOUND_DEBOUNCED') 
            AND run_at <= ? 
          ORDER BY run_at ASC 
          LIMIT 1
        `)
        .get(nowIso) as any;

      if (!job) {
        this.status.whatsappRealtime.active = false;
        return;
      }

      if (job.lead_id && this.leadLocks.has(job.lead_id)) {
        this.status.whatsappRealtime.active = false;
        return;
      }

      if (job.lead_id) this.leadLocks.add(job.lead_id);
      this.status.whatsappRealtime.currentJob = `${job.job_type} on ${job.lead_id}`;

      sqlite.prepare("UPDATE jobs_queue SET status = 'running', updated_at = ? WHERE id = ?").run(nowIso, job.id);
      const payload = JSON.parse(job.payload || '{}');

      if (job.job_type === 'DRAFT_COPY' && job.lead_id) {
        const copyResult = await copywriterAgent.generateOutreach(job.lead_id);
        // If approved and not human locked, enqueue outbound sending
        await this.enqueueJob('SEND_OUTREACH', job.lead_id, { bubbles: copyResult.bubbles }, 3);
      } else if (job.job_type === 'SEND_OUTREACH' && job.lead_id) {
        const lead = sqlite.prepare('SELECT * FROM leads WHERE id = ?').get(job.lead_id) as any;
        if (lead && lead.channel_state !== 'human_locked' && lead.channel_state !== 'do_not_contact') {
          const bubbles = payload.bubbles || [];
          await evolutionClient.sendHumanizedBubbles(lead.phone, bubbles);

          sqlite.prepare(`
            UPDATE leads 
            SET lead_status = 'contacted', 
                channel_state = 'ai_active', 
                active_agent = NULL, 
                active_agent_status = 'Abordagem enviada no WhatsApp. Aguardando resposta...',
                updated_at = ? 
            WHERE id = ?
          `).run(new Date().toISOString(), job.lead_id);
        }
      } else if (job.job_type === 'PROCESS_INBOUND_DEBOUNCED' && job.lead_id) {
        const inboundText = payload.aggregatedText || '';
        await sdrAgent.processInboundMessage(job.lead_id, inboundText);
      }

      sqlite.prepare("UPDATE jobs_queue SET status = 'completed', updated_at = ? WHERE id = ?").run(new Date().toISOString(), job.id);
      if (job.lead_id) this.leadLocks.delete(job.lead_id);
    } catch (err: any) {
      console.error('[WhatsAppRealtimePool Error]:', err);
    } finally {
      this.status.whatsappRealtime.active = false;
      this.status.whatsappRealtime.currentJob = undefined;
    }
  }

  public async runSoftwareFactoryPool(): Promise<void> {
    if (this.status.softwareFactory.active) return;
    this.status.softwareFactory.active = true;

    try {
      const sqlite = getSqlite();
      const nowIso = new Date().toISOString();

      // Check for pending BUILD_CLIENT_SYSTEM jobs
      const job = sqlite
        .prepare(`
          SELECT * FROM jobs_queue 
          WHERE status = 'pending' 
            AND job_type = 'BUILD_CLIENT_SYSTEM' 
            AND run_at <= ? 
          ORDER BY run_at ASC 
          LIMIT 1
        `)
        .get(nowIso) as any;

      if (!job) {
        this.status.softwareFactory.active = false;
        return;
      }

      if (job.lead_id && this.leadLocks.has(job.lead_id)) {
        this.status.softwareFactory.active = false;
        return;
      }

      if (job.lead_id) this.leadLocks.add(job.lead_id);
      this.status.softwareFactory.currentJob = `ArchitectAgent building for ${job.lead_id}`;

      sqlite.prepare("UPDATE jobs_queue SET status = 'running', updated_at = ? WHERE id = ?").run(nowIso, job.id);

      if (job.lead_id) {
        await architectAgent.buildProject(job.lead_id);
      }

      sqlite.prepare("UPDATE jobs_queue SET status = 'completed', updated_at = ? WHERE id = ?").run(new Date().toISOString(), job.id);
      if (job.lead_id) this.leadLocks.delete(job.lead_id);
    } catch (err: any) {
      console.error('[SoftwareFactoryPool Error]:', err);
    } finally {
      this.status.softwareFactory.active = false;
      this.status.softwareFactory.currentJob = undefined;
    }
  }

  public async tick(): Promise<void> {
    const budget = await checkMonthlyBudgetExceeded();
    this.status.budgetExceeded = budget.exceeded;
    this.status.totalSpentUsd = budget.currentSpent;

    // Run pools concurrently without blocking one another!
    await Promise.allSettled([
      // Only run discovery if budget is intact
      budget.exceeded ? Promise.resolve() : this.runDiscoveryPool(),
      this.runWhatsAppRealtimePool(),
      this.runSoftwareFactoryPool(),
    ]);
  }

  public start(pollIntervalMs = 2500): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[AgentMultiplexer] Started autonomous worker loop with 3 concurrent pools.');
    this.loopInterval = setInterval(() => {
      this.tick().catch((err) => console.error('[AgentMultiplexer Tick Error]:', err));
    }, pollIntervalMs);
  }

  public stop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.isRunning = false;
    console.log('[AgentMultiplexer] Stopped worker loop.');
  }
}

export const agentMultiplexer = new AgentMultiplexer();
