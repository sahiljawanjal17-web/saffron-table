'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — features/ai-chat/components/ai-chat-demo.tsx
// Changes: scripted useChat transport replaced by /api/admin/ai/assistant (engine models via OpenRouter),
// model selector, applied website actions shown as tool markers, input box.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@/components/ui/message-scroller';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import type { PublicModel } from '@/lib/ai/models';
import { ModelSelect } from './model-select';

type Applied = { action: string; result: string; ok: boolean };
type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  applied?: Applied[];
  meta?: string;
  error?: boolean;
};

function ToolMarker({ part }: { part: Applied }) {
  return (
    <Marker>
      <MarkerIcon>{part.ok ? <Icons.wand /> : <Icons.alertCircle />}</MarkerIcon>
      <MarkerContent>
        {part.ok ? 'Applied' : 'Skipped'} <span className='text-foreground font-medium'>{part.action}</span> — {part.result}
      </MarkerContent>
    </Marker>
  );
}

const SUGGESTIONS = [
  'Change the theme to olive green, keep it elegant',
  'Aaj ki sales kaisi chal rahi hai?',
  'Mark Kabuli Pulao as sold out for today',
  'Write a warmer hero headline for the homepage'
];

export function AssistantChat({ models, defaultModel }: { models: PublicModel[]; defaultModel: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState(defaultModel);
  const [status, setStatus] = useState<'ready' | 'submitted' | 'error'>('ready');
  const isBusy = status === 'submitted';

  async function send(text: string) {
    const content = text.trim();
    if (!content || isBusy) return;
    const next: ChatItem[] = [...messages, { id: crypto.randomUUID(), role: 'user', content }];
    setMessages(next);
    setInput('');
    setStatus('submitted');
    try {
      const res = await fetch('/api/admin/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: next.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Assistant failed');
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.reply,
          applied: data.applied,
          meta: `${data.model}${data.usedBackup ? ' (backup)' : ''} · ₹${Number(data.costInr).toFixed(4)}`
        }
      ]);
      setStatus('ready');
      if (data.applied?.some((a: Applied) => a.ok)) router.refresh();
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', content: e instanceof Error ? e.message : 'Failed', error: true }
      ]);
      setStatus('error');
    }
  }

  return (
    <div className='relative flex min-h-[640px] flex-1'>
      <div className='bg-card absolute inset-0 mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border'>
        <div className='flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3'>
          <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
            <Icons.sparkles className='size-4' />
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-medium'>Restaurant Assistant</p>
            <p className='text-muted-foreground text-xs'>Ask questions or tell it to change the website</p>
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <ModelSelect models={models} value={model} onChange={setModel} disabled={isBusy} />
            <Badge variant='outline' className='capitalize'>
              {status}
            </Badge>
          </div>
        </div>

        <MessageScrollerProvider defaultScrollPosition='end' scrollPreviousItemPeek={64}>
          <MessageScroller className='min-h-0 flex-1'>
            <MessageScrollerViewport>
              <MessageScrollerContent className='px-4 py-4'>
                {messages.length === 0 ? (
                  <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm'>
                    <Icons.sparkles className='size-8' />
                    <p>Try one of these:</p>
                    <div className='flex max-w-lg flex-wrap justify-center gap-2'>
                      {SUGGESTIONS.map((s) => (
                        <Button key={s} variant='outline' size='sm' onClick={() => send(s)}>
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isUser = message.role === 'user';
                    return (
                      <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={isUser}>
                        <Message align={isUser ? 'end' : 'start'}>
                          <MessageAvatar
                            className={cn(
                              'size-8 self-start',
                              isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                            )}
                          >
                            {isUser ? <Icons.user className='size-4' /> : <Icons.sparkles className='size-4' />}
                          </MessageAvatar>
                          <MessageContent>
                            {message.applied?.map((a, i) => <ToolMarker key={`${message.id}-a${i}`} part={a} />)}
                            <Bubble variant={isUser ? 'default' : 'muted'} align={isUser ? 'end' : 'start'}>
                              <BubbleContent className={cn('whitespace-pre-wrap', message.error && 'text-destructive')}>
                                {message.content}
                              </BubbleContent>
                            </Bubble>
                            {message.meta && <p className='text-muted-foreground text-xs'>{message.meta}</p>}
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })
                )}

                {status === 'submitted' && (
                  <MessageScrollerItem messageId='pending'>
                    <Message align='start'>
                      <MessageAvatar className='bg-primary/10 text-primary size-8 self-start'>
                        <Icons.sparkles className='size-4' />
                      </MessageAvatar>
                      <MessageContent>
                        <Marker>
                          <MarkerContent className='shimmer'>Thinking…</MarkerContent>
                        </Marker>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <form
          className='flex shrink-0 items-end gap-2 border-t px-4 py-3'
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setMessages([])}
            disabled={isBusy || messages.length === 0}
          >
            Restart
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder='e.g. Make the theme terracotta and set tax to 5%'
            className='min-h-9 flex-1 resize-none'
          />
          <LoadingButton type='submit' loading={isBusy} loadingLabel='Thinking' disabled={!input.trim()}>
            <Icons.send className='size-4' /> Send
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}
