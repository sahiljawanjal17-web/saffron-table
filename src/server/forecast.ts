/**
 * Statistical demand forecast. The numbers come from here — the LLM only explains
 * them — so predictions are reproducible and their accuracy is measured (backtest).
 *
 * Model per item: level (exponentially weighted mean of recent days)
 *   × weekday seasonality (shrunk toward 1 when data is thin)
 *   + damped linear trend over the last 4 weeks.
 */
import { round2 } from '@/lib/money';
import { WEEKDAYS, addDays, weekdayOf } from '@/lib/time';
import { dailySeries, itemDailySales } from './analytics';
import { today } from './stock';

const HISTORY_DAYS = 84;

type Series = number[]; // index 0 = oldest

function forecastSeries(history: Series, startDate: string, horizon: number) {
  const n = history.length;
  if (!n) return Array(horizon).fill(0);

  // Level: EWMA over the last 21 days, alpha 0.15
  const recent = history.slice(-21);
  let level = recent[0];
  for (const v of recent.slice(1)) level = 0.15 * v + 0.85 * level;

  // Weekday factors with shrinkage (k = 4 observations)
  const firstDate = addDays(startDate, -n);
  const mean = history.reduce((a, b) => a + b, 0) / n || 0;
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  history.forEach((v, i) => buckets[weekdayOf(addDays(firstDate, i))].push(v));
  const factors = buckets.map((b) => {
    if (!b.length || mean === 0) return 1;
    const raw = b.reduce((a, c) => a + c, 0) / b.length / mean;
    const w = b.length / (b.length + 4);
    return w * raw + (1 - w) * 1;
  });

  // De-seasonalise level so the weekday factor is not applied twice
  const recentFactor =
    recent.reduce((s, _, i) => s + factors[weekdayOf(addDays(firstDate, n - recent.length + i))], 0) /
    recent.length;
  const baseLevel = recentFactor ? level / recentFactor : level;

  // Trend: least squares slope on last 28 days, damped
  const t = history.slice(-28);
  const tn = t.length;
  let slope = 0;
  if (tn >= 7) {
    const xm = (tn - 1) / 2;
    const ym = t.reduce((a, b) => a + b, 0) / tn;
    let num = 0;
    let den = 0;
    t.forEach((y, x) => {
      num += (x - xm) * (y - ym);
      den += (x - xm) ** 2;
    });
    slope = den ? num / den : 0;
  }
  const phi = 0.9;

  return Array.from({ length: horizon }, (_, h) => {
    const damped = (slope * (phi * (1 - Math.pow(phi, h + 1)))) / (1 - phi);
    const wd = weekdayOf(addDays(startDate, h));
    return Math.max(0, (baseLevel + damped) * factors[wd]);
  });
}

/** Mean absolute percentage-style accuracy on the last 7 days (weighted by volume). */
function backtest(history: Series, endDate: string) {
  if (history.length < 35) return null;
  const train = history.slice(0, -7);
  const actual = history.slice(-7);
  const predicted = forecastSeries(train, addDays(endDate, -6), 7);
  const totalActual = actual.reduce((a, b) => a + b, 0);
  if (!totalActual) return null;
  const absErr = actual.reduce((s, a, i) => s + Math.abs(a - predicted[i]), 0);
  return Math.max(0, 1 - absErr / totalActual);
}

export async function buildForecast(period: 'weekly' | 'monthly') {
  const horizon = period === 'weekly' ? 7 : 30;
  const end = addDays(await today(), -1); // last complete day
  const start = addDays(end, -(HISTORY_DAYS - 1));
  const forecastStart = addDays(end, 1);

  const rows = await itemDailySales(start, end);
  const items = new Map<number, { name: string; series: number[]; revenue: number; price: number }>();
  const idx = (date: string) =>
    Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);

  for (const r of rows) {
    const cur = items.get(r.menuItemId) ?? {
      name: r.name,
      series: Array(HISTORY_DAYS).fill(0),
      revenue: 0,
      price: 0
    };
    const qty = Number(r.qty);
    cur.series[idx(r.date)] += qty;
    cur.revenue += Number(r.revenue);
    cur.price = qty ? Number(r.revenue) / qty : cur.price;
    items.set(r.menuItemId, cur);
  }

  const revenueHistory = (await dailySeries(HISTORY_DAYS, end)).map((d) => d.revenue);
  const revenueForecast = forecastSeries(revenueHistory, forecastStart, horizon);

  const perItem = [...items.entries()].map(([id, it]) => {
    const f = forecastSeries(it.series, forecastStart, horizon);
    const last7 = it.series.slice(-7).reduce((a, b) => a + b, 0);
    const prev7 = it.series.slice(-14, -7).reduce((a, b) => a + b, 0);
    const lastPeriod = it.series.slice(-horizon).reduce((a, b) => a + b, 0);
    const predicted = f.reduce((a, b) => a + b, 0);
    return {
      menuItemId: id,
      name: it.name,
      predictedQty: Math.round(predicted),
      predictedRevenue: round2(predicted * it.price),
      lastPeriodQty: Math.round(lastPeriod),
      changePct: lastPeriod ? round2(((predicted - lastPeriod) / lastPeriod) * 100) : null,
      weekOverWeekPct: prev7 ? round2(((last7 - prev7) / prev7) * 100) : null,
      dailyPlan: f.slice(0, 7).map((v, i) => ({
        date: addDays(forecastStart, i),
        weekday: WEEKDAYS[weekdayOf(addDays(forecastStart, i))],
        qty: Math.ceil(v)
      })),
      accuracy: backtest(it.series, end)
    };
  });
  perItem.sort((a, b) => b.predictedRevenue - a.predictedRevenue);

  const weekdayRevenue = WEEKDAYS.map((name, wd) => {
    const vals = revenueHistory.filter((_, i) => weekdayOf(addDays(start, i)) === wd);
    return { weekday: name, avgRevenue: round2(vals.reduce((a, b) => a + b, 0) / (vals.length || 1)) };
  });

  const accuracies = perItem
    .map((p) => ({ a: p.accuracy, w: p.lastPeriodQty }))
    .filter((x): x is { a: number; w: number } => x.a != null);
  const weight = accuracies.reduce((s, x) => s + x.w, 0);
  const overallAccuracy = weight ? accuracies.reduce((s, x) => s + x.a * x.w, 0) / weight : null;

  const lastPeriodRevenue = revenueHistory.slice(-horizon).reduce((a, b) => a + b, 0);
  const predictedRevenue = revenueForecast.reduce((a, b) => a + b, 0);

  return {
    period,
    horizonDays: horizon,
    from: forecastStart,
    to: addDays(forecastStart, horizon - 1),
    historyDays: HISTORY_DAYS,
    hasEnoughData: revenueHistory.filter((v) => v > 0).length >= 14,
    revenue: {
      predicted: round2(predictedRevenue),
      lastPeriod: round2(lastPeriodRevenue),
      changePct: lastPeriodRevenue ? round2(((predictedRevenue - lastPeriodRevenue) / lastPeriodRevenue) * 100) : null,
      daily: revenueForecast.map((v, i) => ({ date: addDays(forecastStart, i), revenue: round2(v) })),
      backtestAccuracy: backtest(revenueHistory, end)
    },
    overallItemAccuracy: overallAccuracy,
    weekdayRevenue,
    items: perItem
  };
}

export type Forecast = Awaited<ReturnType<typeof buildForecast>>;
