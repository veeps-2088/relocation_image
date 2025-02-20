'use client';

export default function LoadingIndicator() {
  return (
    <div className="absolute -top-8 left-0 right-0 flex justify-center">
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
} 