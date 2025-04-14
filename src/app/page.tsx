import { ChatInterface } from './components/ChatInterface';
import { AgentContextProvider } from '@/lib/contexts/AgentContext';
import { ChatProvider } from '@/lib/contexts/ChatContext';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <AgentContextProvider>
        <ChatProvider>
          <ChatInterface />
        </ChatProvider>
      </AgentContextProvider>
    </main>
  );
}
