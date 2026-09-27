import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiUsage } from '@/db/schema';
import { getSetting } from '@/lib/settings';
import {
  AI_CREDIT_BASE_URL,
  FEATURE_MODEL_MAP,
  OPENROUTER_BASE_URL,
  findBackup,
  getModel,
  type AiFeature,
  type EngineModel
} from './models';

// Mirrors engine/orchestrator.py: 2 attempts per model, then the backup model.
const MAX_RETRIES_PER_MODEL = 2;
const RETRY_WAIT_MS = 3000;
const REQUEST_TIMEOUT_MS = 120_000;

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type ChatResult = {
  text: string;
  modelKey: string;
  modelName: string;
  costInr: number;
  usedBackup: boolean;
};

let engineEnvCache: Record<string, string> | null = null;

/** Reads keys from the engine's .env when they are not set on the website itself. */
function engineEnv(): Record<string, string> {
  if (engineEnvCache) return engineEnvCache;
  const dir =
    process.env.ENGINE_DIR || path.join(os.homedir(), 'OneDrive', 'data_science', 'engine');
  const out: Record<string, string> = {};
  try {
    for (const raw of fs.readFileSync(path.join(dir, '.env'), 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // engine folder not present (e.g. production) — env vars must be set directly
  }
  engineEnvCache = out;
  return out;
}

function apiKeyFor(model: EngineModel) {
  const name = model.provider === 'ai_credit' ? 'AI_CREDIT_API_KEY' : 'OPENROUTER_API_KEY';
  const key = process.env[name] || engineEnv()[name];
  if (!key) throw new Error(`${name} is not configured (set it in .env.local or ENGINE_DIR/.env)`);
  return key;
}

function baseUrlFor(model: EngineModel) {
  return model.provider === 'ai_credit' && AI_CREDIT_BASE_URL
    ? AI_CREDIT_BASE_URL
    : OPENROUTER_BASE_URL;
}

export async function aiSpendInr() {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${aiUsage.costInr}), 0)` })
    .from(aiUsage);
  return Number(row?.total ?? 0);
}

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

async function callOnce(
  model: EngineModel,
  messages: ChatMessage[],
  feature: string,
  opts: { maxTokens?: number; temperature?: number }
): Promise<{ text: string; costInr: number }> {
  const maxTokens = opts.maxTokens ?? model.default_max_tokens ?? 2048;

  if (!model.is_free) {
    const { budgetInr } = await getSetting('ai');
    const est =
      (estimateTokens(messages.map((m) => m.content).join(' ')) / 1e6) *
        model.cost_input_per_1m_inr +
      (maxTokens / 1e6) * model.cost_output_per_1m_inr;
    const spent = await aiSpendInr();
    if (spent + est > budgetInr) {
      throw new BudgetError(
        `AI budget of ₹${budgetInr} would be exceeded (spent ₹${spent.toFixed(2)}). Use a free model.`
      );
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrlFor(model)}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKeyFor(model)}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Saffron Table'
      },
      body: JSON.stringify({
        model: model.model_id,
        messages,
        max_tokens: maxTokens,
        temperature: opts.temperature ?? 0.4
      })
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const usage = data?.usage ?? {};
    const inTok = Number(usage.prompt_tokens ?? estimateTokens(JSON.stringify(messages)));
    const outTok = Number(usage.completion_tokens ?? estimateTokens(text));
    const costInr =
      (inTok / 1e6) * model.cost_input_per_1m_inr + (outTok / 1e6) * model.cost_output_per_1m_inr;

    const finish = data?.choices?.[0]?.finish_reason ?? data?.choices?.[0]?.native_finish_reason;
    const emptyError = text.trim()
      ? null
      : `Empty reply (finish_reason=${finish ?? 'n/a'}${data?.error ? `, error=${JSON.stringify(data.error).slice(0, 200)}` : ''})`;
    await db.insert(aiUsage).values({
      modelKey: model.key,
      feature,
      inputTokens: inTok,
      outputTokens: outTok,
      costInr,
      ok: !emptyError,
      error: emptyError
    });
    if (emptyError) throw new Error(`Model returned an empty reply: ${emptyError}`);
    return { text, costInr };
  } finally {
    clearTimeout(timer);
  }
}

export class BudgetError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chat completion with the engine's failure rules:
 * primary model x2 attempts -> its backup model -> error.
 * modelKey 'auto' resolves via FEATURE_MODEL_MAP.
 */
export async function chat(
  feature: AiFeature,
  requestedModel: string,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<ChatResult> {
  const key = !requestedModel || requestedModel === 'auto' ? FEATURE_MODEL_MAP[feature] : requestedModel;
  const primary = getModel(key);
  if (!primary) throw new Error(`Unknown model "${key}"`);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
    try {
      const r = await callOnce(primary, messages, feature, opts);
      return { ...r, modelKey: primary.key, modelName: primary.display_name, usedBackup: false };
    } catch (e) {
      lastError = e;
      if (e instanceof BudgetError) break;
      if (attempt < MAX_RETRIES_PER_MODEL) await sleep(RETRY_WAIT_MS);
    }
  }

  const backup = findBackup(primary.key);
  if (backup) {
    try {
      const r = await callOnce(backup, messages, feature, opts);
      return { ...r, modelKey: backup.key, modelName: backup.display_name, usedBackup: true };
    } catch (e) {
      lastError = e;
    }
  }

  await db
    .insert(aiUsage)
    .values({ modelKey: primary.key, feature, ok: false, error: String(lastError).slice(0, 500) })
    .catch(() => {});
  throw new Error(
    `AI request failed on ${primary.display_name}${backup ? ` and backup ${backup.display_name}` : ''}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf('{');
    const end = c.lastIndexOf('}');
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(c.slice(start, end + 1)) as T;
    } catch {
      // try next candidate
    }
  }
  return null;
}
