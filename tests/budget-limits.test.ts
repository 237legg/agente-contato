import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, getDb } from '@/db';
import { aiCalls } from '@/db/schema';
import { checkMonthlyBudgetExceeded, callLLM } from '@/integrations/llm/router';
import crypto from 'node:crypto';

describe('9. Monthly AI Budget Limits and Safety Cutoff', () => {
  beforeEach(() => {
    initializeDatabase(':memory:');
    process.env.MONTHLY_AI_BUDGET_USD = '10.00';
  });

  it('detects when monthly AI budget limit is intact', async () => {
    const status = await checkMonthlyBudgetExceeded();
    expect(status.exceeded).toBe(false);
    expect(status.budgetLimit).toBe(10);
  });

  it('detects when monthly budget is exceeded and halts LLM calls', async () => {
    const db = getDb();

    // Insert an expensive call exceeding budget
    await db.insert(aiCalls).values({
      id: crypto.randomUUID(),
      agentName: 'ArchitectAgent',
      model: 'gpt-4o',
      inputTokens: 500000,
      outputTokens: 500000,
      latencyMs: 1500,
      costUsd: 15.5, // exceeds $10.00
      createdAt: new Date().toISOString(),
    });

    const status = await checkMonthlyBudgetExceeded();
    expect(status.exceeded).toBe(true);

    // Calling LLM should throw budget exceeded error
    await expect(
      callLLM({
        agentName: 'ScoutAgent',
        model: 'gpt-4o-mini',
        systemPrompt: 'test',
        userPrompt: 'test',
      })
    ).rejects.toThrow('Monthly AI budget exceeded');
  });
});
