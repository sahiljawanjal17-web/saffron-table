'use client';

import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select';
import type { PublicModel } from '@/lib/ai/models';

/** All models from data_science/engine/model_config.py, grouped free / paid. */
export function ModelSelect({
  models,
  value,
  onChange,
  disabled
}: {
  models: PublicModel[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <NativeSelect size='sm' value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className='max-w-72'>
      <NativeSelectOption value='auto'>Auto (best for the task)</NativeSelectOption>
      <NativeSelectOptGroup label='Free models'>
        {models
          .filter((m) => m.isFree)
          .map((m) => (
            <NativeSelectOption key={m.key} value={m.key}>
              {m.name} · {m.category}
            </NativeSelectOption>
          ))}
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label='Paid models (uses AI budget)'>
        {models
          .filter((m) => !m.isFree)
          .map((m) => (
            <NativeSelectOption key={m.key} value={m.key}>
              {m.name} · ₹{m.costOut}/1M
            </NativeSelectOption>
          ))}
      </NativeSelectOptGroup>
    </NativeSelect>
  );
}
