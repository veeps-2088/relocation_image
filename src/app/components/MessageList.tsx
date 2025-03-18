'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import Image from 'next/image';
import ImageCarousel from './ImageCarousel';
import MessageContent from './MessageContent';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  detectionResults?: Array<{
    imageUrl: string;
    objects: {
      highConfidence: string[];
      lowerConfidence: Array<{
        label: string;
        score: string;
        box: {
          xmin: number;
          ymin: number;
          xmax: number;
          ymax: number;
        };
      }>;
    };
  }>;
}

interface MessageListProps {
  messages: Message[];
}

const MessageList = memo(({ messages }: MessageListProps) => {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`rounded-lg px-4 py-2 max-w-[80%] ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <div className="whitespace-pre-wrap">
              <MessageContent message={message} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
export default MessageList; 