import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaGraph } from '@/features/overview/components/area-graph';
import { InsightGenerator } from '@/features/insights/components/insight-generator';
import { getModel, publicModelList } from '@/lib/ai/models';
import { getAllSettings } from '@/lib/settings';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { listInsights } from '@/server/ai-insights';

export const metadata = { title: 'Dashboard: AI Insights' };

const pctText = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export default async function InsightsPage() {
  const [{ business, ai }, insights] = await Promise.all([getAllSettings(), listInsights(10)]);
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const latest = insights[0];

  return (
    <PageContainer
      pageTitle='AI Insights'
      pageDescription='Weekly and monthly demand forecasts with actionable advice. Choose any model from your engine.'
    >
      <div className='space-y-4'>
        <InsightGenerator models={publicModelList()} defaultModel={ai.defaultModel} />

        {!latest && (
          <p className='text-muted-foreground py-10 text-center'>No insights yet. Generate your first forecast above.</p>
        )}

        {latest && (
          <>
            <div className='grid gap-4 md:grid-cols-4'>
              <Card>
                <CardHeader>
                  <CardDescription>Predicted revenue ({latest.period})</CardDescription>
                  <CardTitle className='text-2xl tabular-nums'>{money(latest.forecast.revenue.predicted)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>vs previous period</CardDescription>
                  <CardTitle className='text-2xl tabular-nums'>
                    {latest.forecast.revenue.changePct == null ? '—' : `${latest.forecast.revenue.changePct > 0 ? '+' : ''}${latest.forecast.revenue.changePct}%`}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Revenue model accuracy (backtest)</CardDescription>
                  <CardTitle className='text-2xl tabular-nums'>{pctText(latest.forecast.revenue.backtestAccuracy)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Dish-level accuracy (backtest)</CardDescription>
                  <CardTitle className='text-2xl tabular-nums'>{pctText(latest.forecast.overallItemAccuracy)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className='grid gap-4 lg:grid-cols-7'>
              <div className='lg:col-span-4'>
                <AreaGraph chartData={latest.forecast.revenue.daily} changePct={latest.forecast.revenue.changePct} />
              </div>
              <Card className='lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>
                    {getModel(latest.modelKey)?.display_name ?? latest.modelKey} ·{' '}
                    {formatDateTime(latest.createdAt, business.timezone, business.locale)}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4 text-sm'>
                  <p className='leading-relaxed'>{latest.content.summary}</p>
                  {latest.content.topPredictions.length > 0 && (
                    <div className='space-y-2'>
                      <p className='font-medium'>Expected best sellers</p>
                      {latest.content.topPredictions.map((t) => (
                        <p key={t.item}>
                          <span className='font-medium'>{t.item}</span> — <span className='text-muted-foreground'>{t.why}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {latest.content.recommendations.length > 0 && (
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {latest.content.recommendations.map((r) => (
                  <Card key={r.title}>
                    <CardHeader>
                      <CardTitle className='flex items-start justify-between gap-2 text-base'>
                        {r.title}
                        <Badge variant={r.impact === 'high' ? 'default' : 'outline'} className='capitalize'>
                          {r.impact}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='text-muted-foreground text-sm'>{r.detail}</CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Dish forecast</CardTitle>
                <CardDescription>
                  {latest.forecast.from} → {latest.forecast.to} · prep plan for the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dish</TableHead>
                      <TableHead className='text-right'>Predicted qty</TableHead>
                      <TableHead className='text-right'>Last period</TableHead>
                      <TableHead className='text-right'>Change</TableHead>
                      <TableHead className='text-right'>Revenue</TableHead>
                      <TableHead>Next 7 days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latest.forecast.items.slice(0, 20).map((i) => (
                      <TableRow key={i.menuItemId}>
                        <TableCell className='font-medium'>{i.name}</TableCell>
                        <TableCell className='text-right tabular-nums'>{i.predictedQty}</TableCell>
                        <TableCell className='text-right tabular-nums'>{i.lastPeriodQty}</TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {i.changePct == null ? '—' : `${i.changePct > 0 ? '+' : ''}${i.changePct}%`}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>{money(i.predictedRevenue)}</TableCell>
                        <TableCell className='text-muted-foreground text-xs whitespace-nowrap'>
                          {i.dailyPlan.map((d) => `${d.weekday} ${d.qty}`).join(' · ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {latest.content.risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Risks to watch</CardTitle>
                </CardHeader>
                <CardContent className='text-muted-foreground list-disc space-y-1 pl-10 text-sm'>
                  {latest.content.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {insights.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              {insights.slice(1).map((i) => (
                <div key={i.id} className='flex justify-between gap-4 border-b pb-2 last:border-0'>
                  <span>
                    <Badge variant='outline' className='mr-2 capitalize'>
                      {i.period}
                    </Badge>
                    {i.content.summary.slice(0, 140)}
                    {i.content.summary.length > 140 ? '…' : ''}
                  </span>
                  <span className='text-muted-foreground whitespace-nowrap'>
                    {formatDateTime(i.createdAt, business.timezone, business.locale)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
