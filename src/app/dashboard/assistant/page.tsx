import PageContainer from '@/components/layout/page-container';
import { AssistantChat } from '@/features/assistant/components/assistant-chat';
import { publicModelList } from '@/lib/ai/models';
import { getSetting } from '@/lib/settings';

export const metadata = { title: 'Dashboard: AI Assistant' };

export default async function AssistantPage() {
  const ai = await getSetting('ai');
  return (
    <PageContainer
      pageTitle='AI Assistant'
      pageDescription='Ask about your business or change the website in plain words — theme, colours, texts, prices, stock.'
    >
      <AssistantChat models={publicModelList()} defaultModel={ai.defaultModel} />
    </PageContainer>
  );
}
