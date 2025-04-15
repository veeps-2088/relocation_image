'use client';

import { useState } from 'react';
import { useChat } from 'ai/react';

export default function TestChat() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/openai/chat',
    body: {
      data: imageUrl && detectedObjects ? {
        imageUrl,
        detectedObjects
      } : undefined
    },
    onResponse: (response) => {
      console.log('Response received:', response);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  // Simulate image upload and object detection
  const simulateImageUpload = () => {
    setImageUrl('https://example.com/test-image.jpg');
    setDetectedObjects('couch, table, chair, lamp');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Chat</h1>
      
      <div className="mb-4">
        <button
          onClick={simulateImageUpload}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Simulate Image Upload
        </button>
        {imageUrl && (
          <div className="mt-2">
            <p>Image URL: {imageUrl}</p>
            <p>Detected Objects: {detectedObjects}</p>
          </div>
        )}
      </div>

      <div className="mb-4 h-96 overflow-y-auto border rounded p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-2 p-2 rounded ${
              message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <p className="font-semibold">{message.role}:</p>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Send
        </button>
      </form>
    </div>
  );
} 