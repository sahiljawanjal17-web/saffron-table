import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-server';
import { runAssistant } from '@/server/ai-assistant';

export const maxDuration = 300;

const bodySchema = z.object({
  model: z.string().default('auto'),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .min(1)
    .max(40)
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    const result = await runAssistant(body.messages, body.model);
    if (result.applied.some((a) => a.ok)) revalidatePath('/', 'layout');
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Assistant failed' }, { status: 500 });
  }
}
