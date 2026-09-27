'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — features/overview/components. Changes: real data via props.

import { LabelList, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';


const chartConfig = {
  count: { label: 'Orders' },
  dine_in: { label: 'Dine in', color: 'var(--chart-1)' },
  takeaway: { label: 'Takeaway', color: 'var(--chart-2)' },
  delivery: { label: 'Delivery', color: 'var(--chart-3)' },
  online: { label: 'Online', color: 'var(--chart-4)' }
} satisfies ChartConfig;

export function PieGraph({ data }: { data: { type: string; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, fill: `var(--color-${d.type})` }));
  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          Order mix
        </CardTitle>
        <CardDescription>By order type, last 30 days</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='type' hideLabel />} />
            <Pie
              data={chartData}
              innerRadius={30}
              dataKey='count'
              nameKey='type'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='count'
                stroke='none'
                fontSize={12}
                fontWeight={500}
                fill='currentColor'
                formatter={(value) => String(value ?? '')}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
