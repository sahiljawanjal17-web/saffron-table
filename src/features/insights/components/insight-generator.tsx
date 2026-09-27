'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import type { PublicModel } from '@/lib/ai/models';
import { ModelSelect } from '@/features/assistant/components/model-select';
import { generateInsightAction } from '../actions';

export function InsightGenerator({ models, defaultModel }: { models: PublicModel[]; defaultModel: string }) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [model, setModel] = useState(defaultModel);
  const [pending, start] = useTransition();

  return (
    <div className='bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4'>
      <NativeSelect size='sm' value={period} onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}>
        <NativeSelectOption value='weekly'>Next 7 days</NativeSelectOption>
        <NativeSelectOption value='monthly'>Next 30 days</NativeSelectOption>
      </NativeSelect>
      <ModelSelect models={models} value={model} onChange={setModel} disabled={pending} />
      <LoadingButton
        loading={pending}
        loadingLabel='Analysing'
        onClick={() =>
          start(async () => {
            const r = await generateInsightAction(period, model);
            if (r.ok) toast.success(`Insights ready · ${r.model}${r.usedBackup ? ' (backup)' : ''} · ₹${r.costInr.toFixed(4)}`);
            else toast.error(r.error);
          })
        }
      >
        <Icons.sparkles /> Generate insights
      </LoadingButton>
      <p className='text-muted-foreground text-xs'>
        Numbers come from a statistical model on your sales; AI explains them. Free models can take a minute.
      </p>
    </div>
  );
}
