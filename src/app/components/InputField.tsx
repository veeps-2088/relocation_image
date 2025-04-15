'use client';

import { useState, useRef } from 'react';

interface InputFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent, imageUrls?: string[]) => void;
  onImageUpload: (files: File[]) => Promise<string[]>;
  isLoading: boolean;
}

export default function InputField({
  value,
  onChange,
  onSubmit,
  onImageUpload,
  isLoading,
}: InputFieldProps) {
  const [isImagesSent, setIsImagesSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        await onImageUpload(files);
        setIsImagesSent(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Error uploading images:', error);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(e);
      setIsImagesSent(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={onChange}
            placeholder={isImagesSent ? "Add a message..." : "Type your message or upload images..."}
            className="w-full rounded-lg border pr-10 p-2 dark:bg-gray-800 dark:border-gray-700"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
            className="hidden"
            multiple
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-2 bottom-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
} 