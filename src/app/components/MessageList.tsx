'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import Image from 'next/image';
import ImageCarousel from './ImageCarousel';

interface MessageListProps {
  messages: ChatMessage[];
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
            className={`rounded-lg p-4 max-w-[80%] ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {message.imageUrl && (
              <div className="mb-2">
                <Image
                  src={message.imageUrl}
                  alt="Uploaded image"
                  width={300}
                  height={300}
                  className="rounded-lg"
                />
              </div>
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.lowerConfidenceObjects && message.lowerConfidenceObjects.length > 0 && message.imageUrl && (
              <div className="mt-4">
                <p className="text-sm mb-2">Lower confidence detections (50-89%):</p>
                <ImageCarousel
                  imageUrl={message.imageUrl}
                  detectedObjects={message.lowerConfidenceObjects}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
export default MessageList; 