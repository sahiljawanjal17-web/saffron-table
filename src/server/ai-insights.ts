import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { aiInsights } from '@/db/schema';
import { chat, extractJson } from '@/lib/ai/client';
import { getAllSettings } from '@/lib/settings';
import { buildForecast, type Forecast } from './forecast';

export type InsightContent = {
  summary: string;
  topPredictions: { item: string; why: string }[];
  recommendations: { title: string; detail: string; impact: 'high' | 'medium' | 'low' }[];
  prepPlan: { item: string; dailyQty: string }[];
  risks: string[];
};

function compactForecast(f: Forecast) {
  return {
    period: f.period,
    window: `${f.from} to ${f.to}`,
    revenue: f.revenue,
    modelAccuracy: {
      revenueBacktest: f.revenue.backtestAccuracy,
      itemsWeighted: f.overallItemAccuracy
    },
    weekdayRevenue: f.weekdayRevenue,
    items: f.items.slice(0, 15).map((i) => ({
      name: i.name,
      predictedQty: i.predictedQty,
      predictedRevenue: i.predictedRevenue,
      lastPeriodQty: i.lastPeriodQty,
      changePct: i.changePct,
      weekOverWeekPct: i.weekOverWeekPct,
      next7DaysPlan: i.dailyPlan.map((d) => `${d.weekday}:${d.qty}`).join(' ')
    }))
  };
}

const SYSTEM = `You are a senior restaurant revenue analyst.
You receive a STATISTICAL FORECAST computed from real sales (level + weekday seasonality + damped trend,
with backtest accuracy). Do not invent numbers: every figure you mention must come from the data.
Turn it into specific, actionable advice for the owner: prep quantities, staffing by weekday, menu
promotion, stock-out prevention, pricing. Be concise and practical.

Reply with ONE JSON object only:
{
 "summary": "2-3 sentences",
 "topPredictions": [{"item": "", "why": ""}],
 "recommendations": [{"title": "", "detail": "", "impact": "high|medium|low"}],
 "prepPlan": [{"item": "", "dailyQty": "e.g. Fri 42, Sat 48, Sun 45"}],
 "risks": [""]
}`;

export async function generateInsight(period: 'weekly' | 'monthly', model: string) {
  const [forecast, { brand, business }] = await Promise.all([buildForecast(period), getAllSettings()]);
  if (!forecast.hasEnoughData) {
    throw new Error('Not enough sales history yet — at least 14 days of orders are needed for a forecast.');
  }
  const result = await chat(
    'insights',
    model,
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Restaurant: ${brand.name} (${brand.tagline}). Currency: ${business.currency}.\n${period.toUpperCase()} FORECAST DATA:\n${JSON.stringify(compactForecast(forecast))}`
      }
    ],
    { temperature: 0.2 }
  );

  const parsed = extractJson<InsightContent>(result.text);
  const content: InsightContent = parsed?.summary
    ? {
        summary: parsed.summary,
        topPredictions: parsed.topPredictions ?? [],
        recommendations: parsed.recommendations ?? [],
        prepPlan: parsed.prepPlan ?? [],
        risks: parsed.risks ?? []
      }
    : { summary: result.text, topPredictions: [], recommendations: [], prepPlan: [], risks: [] };

  const [row] = await db
    .insert(aiInsights)
    .values({ period, modelKey: result.modelKey, forecast, content: JSON.stringify(content) })
    .returning();
  return { id: row.id, forecast, content, model: result.modelName, usedBackup: result.usedBackup, costInr: result.costInr };
}

export async function listInsights(limit = 10) {
  const rows = await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt)).limit(limit);
  return rows.map((r) => ({
    ...r,
    forecast: r.forecast as Forecast,
    content: JSON.parse(r.content) as InsightContent
  }));
}
