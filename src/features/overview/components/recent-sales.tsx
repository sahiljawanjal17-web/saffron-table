// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — features/overview/components. Changes: real data via props.
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';


export function RecentSales({
  salesData,
  description
}: {
  salesData: { name: string; detail: string; amount: string }[];
  description: string;
}) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {salesData.map((sale, index) => (
            <div key={index} className='flex items-center'>
              <Avatar className='h-9 w-9'>
                <AvatarFallback>
                  {sale.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className='ml-4 space-y-1'>
                <p className='text-sm leading-none font-medium'>{sale.name}</p>
                <p className='text-muted-foreground text-sm'>{sale.detail}</p>
              </div>
              <div className='ml-auto font-medium'>{sale.amount}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
