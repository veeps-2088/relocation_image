'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy } from 'lucide-react';
import { ChatMessage } from '@/lib/types';

interface MessageListProps {
  messages: ChatMessage[];
}

const MessageList = memo(({ messages }: MessageListProps) => {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`mb-4 ${
            message.role === 'assistant'
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'bg-white dark:bg-gray-900'
          } rounded-lg p-4`}
        >
          {message.imageUrl && (
            <div className="mb-4">
              <img
                src={message.imageUrl}
                alt="Uploaded content"
                className="max-h-60 rounded-lg object-contain"
              />
              {message.imageAnalysis && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>Detected objects: {message.imageAnalysis.objects?.join(', ')}</p>
                  {message.imageAnalysis.description && (
                    <p className="mt-1">{message.imageAnalysis.description}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {message.content && (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
export default MessageList; 