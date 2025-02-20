'use client';

import { useChatStore } from '@/lib/store/chatStore';
import { AIModel } from '@/lib/types/chat';

export default function ModelSelector() {
  const { selectedModel, setSelectedModel } = useChatStore();

  return (
    <div className="mb-4">
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value as AIModel)}
        className="w-full md:w-auto px-4 py-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
      >
        <option value="gpt-4">GPT-4</option>
        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
      </select>
    </div>
  );
} 