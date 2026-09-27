import { getOrderWithItems } from '@/server/orders';
import { orderBillText } from '@/server/bill';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const order = await getOrderWithItems({ code: decodeURIComponent(code).toUpperCase() });
  if (!order) return new Response('Order not found', { status: 404 });
  const text = await orderBillText(order);
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="bill-${order.code}.txt"`
    }
  });
}
