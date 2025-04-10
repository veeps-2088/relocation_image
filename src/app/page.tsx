import { ChatInterface } from './components/ChatInterface';
import { AgentContextProvider } from '@/lib/contexts/AgentContext';

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <AgentContextProvider>
        <ChatInterface />
      </AgentContextProvider>
    </main>
  );
}
