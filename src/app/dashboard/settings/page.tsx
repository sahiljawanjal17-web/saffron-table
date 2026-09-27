import { desc } from 'drizzle-orm';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/db';
import { aiUsage } from '@/db/schema';
import { AiForm, BrandForm, BusinessForm, PaymentsForm, ThemeForm } from '@/features/settings/components/settings-forms';
import { gatewayConfigured } from '@/lib/payment-methods';
import { aiSpendInr } from '@/lib/ai/client';
import { getModel, publicModelList } from '@/lib/ai/models';
import { getAllSettings } from '@/lib/settings';
import { formatDateTime } from '@/lib/time';

export const metadata = { title: 'Dashboard: Settings' };

export default async function SettingsPage() {
  const [settings, spent, usage] = await Promise.all([
    getAllSettings(),
    aiSpendInr(),
    db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(15)
  ]);

  return (
    <PageContainer pageTitle='Settings' pageDescription='Brand, theme, business rules and AI configuration.'>
      <div className='space-y-4'>
        <ThemeForm theme={settings.theme} />
        <BrandForm brand={settings.brand} />
        <BusinessForm business={settings.business} />
        <PaymentsForm
          payments={settings.payments}
          gateways={{ razorpay: gatewayConfigured.razorpay(), stripe: gatewayConfigured.stripe() }}
        />
        <AiForm ai={settings.ai} models={publicModelList()} spent={spent} />
        <Card>
          <CardHeader>
            <CardTitle>Recent AI calls</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className='text-right'>Tokens in/out</TableHead>
                  <TableHead className='text-right'>Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className='whitespace-nowrap'>
                      {formatDateTime(u.createdAt, settings.business.timezone, settings.business.locale)}
                    </TableCell>
                    <TableCell className='capitalize'>{u.feature}</TableCell>
                    <TableCell>{getModel(u.modelKey)?.display_name ?? u.modelKey}</TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {u.inputTokens} / {u.outputTokens}
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>₹{u.costInr.toFixed(4)}</TableCell>
                    <TableCell>
                      <Badge variant={u.ok ? 'secondary' : 'destructive'} title={u.error ?? ''}>
                        {u.ok ? 'ok' : 'failed'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!usage.length && (
                  <TableRow>
                    <TableCell colSpan={6} className='text-muted-foreground py-6 text-center'>
                      No AI calls yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
