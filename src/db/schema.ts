import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  tradeName: text('trade_name'),
  decisionMakerName: text('decision_maker_name'),
  cnpj: text('cnpj').unique(),
  segment: text('segment').notNull(), // 'clinica' | 'restaurante' | 'comercio'
  city: text('city').notNull(),
  phone: text('phone').notNull().unique(),
  website: text('website'),
  mapsUrl: text('maps_url'),
  icpScore: integer('icp_score').default(0).notNull(),
  leadStatus: text('lead_status').default('discovered').notNull(),
  channelState: text('channel_state').default('whatsapp_pending_validation').notNull(),
  activeAgent: text('active_agent'),
  activeAgentStatus: text('active_agent_status'),
  primaryBottleneck: text('primary_bottleneck'),
  estimatedMonthlyLoss: real('estimated_monthly_loss'),
  scheduledCalendarTime: text('scheduled_calendar_time'),
  scheduledCalendarEventId: text('scheduled_calendar_event_id'),
  googleMeetUrl: text('google_meet_url'),
  archived: integer('archived').default(0).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const diagnosticDossiers = sqliteTable('diagnostic_dossiers', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  digitalPresence: text('digital_presence').notNull(), // JSON
  reviewsSummary: text('reviews_summary').notNull(), // JSON
  primaryBottleneck: text('primary_bottleneck').notNull(),
  secondaryBottlenecks: text('secondary_bottlenecks').notNull(), // JSON
  financialLossEstimate: real('financial_loss_estimate').notNull(),
  conservativeRoi: text('conservative_roi').notNull(),
  recommendedStack: text('recommended_stack').notNull(), // JSON
  criticScore: integer('critic_score'),
  criticFeedback: text('critic_feedback'),
  rawData: text('raw_data'), // JSON
  createdAt: text('created_at').notNull(),
});

export const outreachDrafts = sqliteTable('outreach_drafts', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  iteration: integer('iteration').default(1).notNull(),
  bubble1: text('bubble_1').notNull(),
  bubble2: text('bubble_2').notNull(),
  bubble3: text('bubble_3').notNull(),
  wordCount: integer('word_count').notNull(),
  criticApproved: integer('critic_approved').default(0).notNull(),
  criticRejectionReason: text('critic_rejection_reason'),
  createdAt: text('created_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  sender: text('sender').notNull(), // 'lead' | 'ai_sdr' | 'human_operator' | 'system'
  content: text('content').notNull(),
  mediaType: text('media_type').default('text').notNull(), // 'text' | 'audio' | 'image'
  mediaUrl: text('media_url'),
  audioTranscription: text('audio_transcription'),
  evolutionMessageId: text('evolution_message_id').unique(),
  createdAt: text('created_at').notNull(),
});

export const dealHandoverSpecs = sqliteTable('deal_handover_specs', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().unique().references(() => leads.id),
  projectSlug: text('project_slug').notNull(),
  clientTradeName: text('client_trade_name').notNull(),
  niche: text('niche').notNull(), // 'clinica' | 'restaurante' | 'comercio'
  agreedSetupPrice: real('agreed_setup_price'),
  agreedMonthlyPrice: real('agreed_monthly_price'),
  requestedFeatures: text('requested_features').notNull(), // JSON array
  specialInstructions: text('special_instructions'),
  confirmedByOperator: integer('confirmed_by_operator').default(1).notNull(),
  confirmedAt: text('confirmed_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const projectBuildLogs = sqliteTable('project_build_logs', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull().references(() => leads.id),
  stepName: text('step_name').notNull(), // 'PRD' | 'DATABASE' | 'BACKEND_BI' | 'TESTS_BUILD' | 'DELIVERED' | 'ERROR'
  progressPercent: integer('progress_percent').default(0).notNull(),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  message: text('message').notNull(),
  artifactPath: text('artifact_path'),
  createdAt: text('created_at').notNull(),
});

export const jobsQueue = sqliteTable('jobs_queue', {
  id: text('id').primaryKey(),
  jobType: text('job_type').notNull(),
  leadId: text('lead_id').references(() => leads.id),
  payload: text('payload').notNull(), // JSON
  status: text('status').default('pending').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  runAt: text('run_at').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiCalls = sqliteTable('ai_calls', {
  id: text('id').primaryKey(),
  agentName: text('agent_name').notNull(),
  leadId: text('lead_id').references(() => leads.id),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  latencyMs: integer('latency_ms').default(0).notNull(),
  costUsd: real('cost_usd').default(0).notNull(),
  purpose: text('purpose'),
  createdAt: text('created_at').notNull(),
});

export const doNotContact = sqliteTable('do_not_contact', {
  phone: text('phone').primaryKey(),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
});
