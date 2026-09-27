'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — features/overview/components. Changes: real data via props.

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import React from 'react';


const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function AreaGraph({
  chartData,
  changePct
}: {
  chartData: { date: string; revenue: number }[];
  changePct: number | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Revenue
          {changePct != null && (
            <Badge variant='outline'>
              {changePct >= 0 ? <Icons.trendingUp /> : <Icons.trendingDown />}
              {changePct >= 0 ? '+' : ''}
              {changePct}%
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Last 30 days, compared with the 30 days before</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => String(value).slice(5)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <DottedBackgroundPattern config={chartConfig} />
            </defs>
            <Area
              dataKey='revenue'
              type='natural'
              fill='url(#dotted-background-pattern-revenue)'
              fillOpacity={0.5}
              stroke='var(--color-revenue)'
              strokeWidth={1.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const DottedBackgroundPattern = ({ config }: { config: ChartConfig }) => {
  const items = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.color])
  );
  return (
    <>
      {Object.entries(items).map(([key, value]) => (
        <pattern
          key={key}
          id={`dotted-background-pattern-${key}`}
          x='0'
          y='0'
          width='7'
          height='7'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='5' cy='5' r='1.5' fill={value} opacity={0.5}></circle>
        </pattern>
      ))}
    </>
  );
};
