import { requireAdmin } from '@/lib/auth-server';
import { buildDaySummary, daySummaryText } from '@/server/reports';
import { today } from '@/server/stock';

export async function GET(req: Request) {
  await requireAdmin();
  const param = new URL(req.url).searchParams.get('date');
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : await today();
  const text = await daySummaryText(await buildDaySummary(date));
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="end-of-day-${date}.txt"`
    }
  });
}
