'use client';
// Form pattern from Kiranism starter (MIT) — useAppForm + form.AppField field components.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAppForm } from '@/lib/form';
import { cn } from '@/lib/utils';
import type { BrandSettings, BusinessSettings, AiSettings } from '@/lib/settings';
import { THEME_PRESETS, type ThemeSettings } from '@/lib/theme-presets';
import type { PublicModel } from '@/lib/ai/models';
import { ModelSelect } from '@/features/assistant/components/model-select';
import { saveAi, saveBrand, saveBusiness, savePayments, saveTheme } from '../actions';
import type { PaymentSettings } from '@/lib/settings';
import { Badge } from '@/components/ui/badge';

function useSaver() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>, ok = 'Saved') =>
    start(async () => {
      try {
        await fn();
        toast.success(ok);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not save');
      }
    });
  return { pending, run };
}

export function BrandForm({ brand }: { brand: BrandSettings }) {
  const { pending, run } = useSaver();
  const form = useAppForm({
    defaultValues: brand,
    onSubmit: async ({ value }) => run(() => saveBrand(value), 'Brand updated')
  });
  const text = (name: keyof BrandSettings, label: string) => (
    <form.AppField name={name} children={(field) => <field.TextField label={label} />} />
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand & contact</CardTitle>
        <CardDescription>Shown across the public website.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id='brand-form'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className='grid gap-4 md:grid-cols-2'>
              {text('name', 'Restaurant name')}
              {text('tagline', 'Tagline')}
            </div>
            {text('heroTitle', 'Homepage headline')}
            <form.AppField name='heroSubtitle' children={(field) => <field.TextareaField label='Homepage sub-headline' rows={2} />} />
            <form.AppField name='about' children={(field) => <field.TextareaField label='About / story' rows={4} />} />
            <div className='grid gap-4 md:grid-cols-2'>
              {text('phone', 'Phone')}
              {text('email', 'Email')}
              {text('address', 'Address')}
              {text('hours', 'Opening hours')}
              {text('instagram', 'Instagram handle')}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <LoadingButton loading={pending} type='submit' form='brand-form'>
          Save brand
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

export function BusinessForm({ business }: { business: BusinessSettings }) {
  const { pending, run } = useSaver();
  const form = useAppForm({
    defaultValues: business,
    onSubmit: async ({ value }) => run(() => saveBusiness(value), 'Business settings updated')
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business</CardTitle>
        <CardDescription>Currency, tax, timezone and what customers can do online.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id='business-form'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className='grid gap-4 md:grid-cols-3'>
              <form.AppField name='currency' children={(field) => <field.TextField label='Currency (ISO)' maxLength={3} />} />
              <form.AppField name='locale' children={(field) => <field.TextField label='Locale' placeholder='en-IN' />} />
              <form.AppField name='timezone' children={(field) => <field.TextField label='Timezone' placeholder='Asia/Kolkata' />} />
              <form.AppField name='taxPercent' children={(field) => <field.TextField label='Tax %' type='number' step='0.1' min={0} />} />
              <form.AppField
                name='lowStockThreshold'
                children={(field) => <field.TextField label='Low stock alert at' type='number' min={0} />}
              />
            </div>
            <form.AppField name='onlineOrdering' children={(field) => <field.SwitchField label='Online ordering open' />} />
            <form.AppField name='reservations' children={(field) => <field.SwitchField label='Accept reservations' />} />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <LoadingButton loading={pending} type='submit' form='business-form'>
          Save business
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

export function ThemeForm({ theme }: { theme: ThemeSettings }) {
  const { pending, run } = useSaver();
  const [preset, setPreset] = useState(theme.preset);
  const [primary, setPrimary] = useState(theme.primary ?? '');
  const [accent, setAccent] = useState(theme.accent ?? '');
  const [radius, setRadius] = useState(theme.radius ?? 0.625);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>Premium palettes only. Custom colours are automatically toned down if they look neon.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {THEME_PRESETS.map((t) => (
            <button
              key={t.value}
              type='button'
              onClick={() => setPreset(t.value)}
              className={cn('rounded-xl border p-3 text-left transition', preset === t.value ? 'border-primary ring-primary ring-2' : 'hover:border-primary/50')}
            >
              <div className='mb-3 flex h-10 overflow-hidden rounded-md'>
                {[t.light.bg, t.light.primary, t.light.accent, t.dark.bg].map((c) => (
                  <span key={c} className='flex-1' style={{ background: c }} />
                ))}
              </div>
              <p className='font-medium'>{t.name}</p>
              <p className='text-muted-foreground text-xs'>{t.description}</p>
            </button>
          ))}
        </div>
        <div className='grid gap-4 sm:grid-cols-3'>
          <div className='space-y-1.5'>
            <Label>Custom primary (optional)</Label>
            <div className='flex gap-2'>
              <Input type='color' value={primary || '#9a6b2c'} onChange={(e) => setPrimary(e.target.value)} className='w-12 p-1' />
              <Input value={primary} placeholder='#9a6b2c' onChange={(e) => setPrimary(e.target.value)} />
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Custom accent (optional)</Label>
            <div className='flex gap-2'>
              <Input type='color' value={accent || '#6b1f2a'} onChange={(e) => setAccent(e.target.value)} className='w-12 p-1' />
              <Input value={accent} placeholder='#6b1f2a' onChange={(e) => setAccent(e.target.value)} />
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label>Corner radius ({radius}rem)</Label>
            <Input type='range' min={0} max={1.25} step={0.125} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </div>
        </div>
      </CardContent>
      <CardFooter className='gap-2'>
        <LoadingButton
          loading={pending}
          onClick={() =>
            run(async () => {
              const r = await saveTheme({ preset, primary: primary || null, accent: accent || null, radius });
              if (r.adjusted) toast.info('A colour was toned down to keep the look premium.');
            }, 'Theme applied')
          }
        >
          Apply theme
        </LoadingButton>
        <Button
          variant='ghost'
          onClick={() => {
            setPrimary('');
            setAccent('');
          }}
        >
          Clear custom colours
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AiForm({ ai, models, spent }: { ai: AiSettings; models: PublicModel[]; spent: number }) {
  const { pending, run } = useSaver();
  const [budget, setBudget] = useState(String(ai.budgetInr));
  const [model, setModel] = useState(ai.defaultModel);
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI</CardTitle>
        <CardDescription>
          Models come from data_science/engine/model_config.py. Paid calls stop when the budget is reached. Spent so far: ₹
          {spent.toFixed(2)}.
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='budget'>Budget cap (₹)</Label>
          <Input id='budget' type='number' min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className='space-y-1.5'>
          <Label>Default model</Label>
          <ModelSelect models={models} value={model} onChange={setModel} />
        </div>
      </CardContent>
      <CardFooter>
        <LoadingButton loading={pending} onClick={() => run(() => saveAi({ budgetInr: Number(budget), defaultModel: model }), 'AI settings saved')}>
          Save AI settings
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}

export function PaymentsForm({
  payments,
  gateways
}: {
  payments: PaymentSettings;
  gateways: { razorpay: boolean; stripe: boolean };
}) {
  const { pending, run } = useSaver();
  const form = useAppForm({
    defaultValues: payments,
    onSubmit: async ({ value }) => run(() => savePayments(value), 'Payment settings saved')
  });
  const keyBadge = (ok: boolean) => (
    <Badge variant={ok ? 'secondary' : 'outline'}>{ok ? 'API keys connected' : 'Add API keys in env'}</Badge>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>
          Choose what customers can use. Gateway secret keys are never stored here — they go in environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id='payments-form'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <div className='grid gap-6 md:grid-cols-2'>
              <div className='space-y-4'>
                <p className='text-sm font-medium'>Pay later</p>
                <form.AppField name='payOnCollection' children={(field) => <field.SwitchField label='Pay at counter / table (pick-up & dine-in)' />} />
                <form.AppField name='cash' children={(field) => <field.SwitchField label='Cash on delivery' />} />
                <form.AppField name='cardOnDelivery' children={(field) => <field.SwitchField label='Card / UPI on delivery' />} />
              </div>
              <div className='space-y-4'>
                <p className='text-sm font-medium'>Pay online</p>
                <div className='flex items-center justify-between gap-2'>
                  <form.AppField name='razorpay' children={(field) => <field.SwitchField label='Razorpay (UPI, cards, netbanking, wallets)' />} />
                  {keyBadge(gateways.razorpay)}
                </div>
                <div className='flex items-center justify-between gap-2'>
                  <form.AppField name='stripe' children={(field) => <field.SwitchField label='Stripe (international cards, Apple / Google Pay)' />} />
                  {keyBadge(gateways.stripe)}
                </div>
                <form.AppField name='upiQr' children={(field) => <field.SwitchField label='UPI QR (direct to your UPI ID, verify manually)' />} />
              </div>
            </div>
            <div className='grid gap-4 md:grid-cols-3'>
              <form.AppField name='upiId' children={(field) => <field.TextField label='Your UPI ID' placeholder='restaurant@okaxis' />} />
              <form.AppField name='upiPayeeName' children={(field) => <field.TextField label='UPI payee name' />} />
              <form.AppField
                name='holdMinutes'
                children={(field) => (
                  <field.TextField
                    label='Hold stock for unpaid online orders (min)'
                    type='number'
                    min={5}
                    max={240}
                  />
                )}
              />
            </div>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <LoadingButton loading={pending} type='submit' form='payments-form'>
          Save payments
        </LoadingButton>
      </CardFooter>
    </Card>
  );
}
