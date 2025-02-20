'use client';

import { Message } from 'ai';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy } from 'lucide-react';

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
            className={`relative max-w-xl rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Uploaded"
                className="max-w-sm rounded-lg mb-2"
              />
            )}
            <ReactMarkdown 
              className="prose dark:prose-invert max-w-none"
              components={{
                pre: ({ node, ...props }) => (
                  <div className="overflow-auto my-2 p-2 bg-gray-800 rounded-lg">
                    <pre {...props} />
                  </div>
                ),
                code: ({ node, ...props }) => (
                  <code className="bg-gray-800 rounded px-1" {...props} />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            <button
              onClick={() => copyToClipboard(message.content)}
              className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
export default MessageList; 