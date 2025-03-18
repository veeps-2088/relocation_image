'use client';

import { useState, useRef } from 'react';

interface InputFieldProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent, imageUrls?: string[]) => void;
  isLoading: boolean;
  onStopGeneration: () => void;
}

export default function InputField({
  input,
  handleInputChange,
  onSubmit,
  isLoading,
  onStopGeneration,
}: InputFieldProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isImagesSent, setIsImagesSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageUrls: string[] = [];

    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      imageUrls.push(dataUrl);
    }

    setSelectedImages(imageUrls);
    setIsImagesSent(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedImages.length > 0 && !isImagesSent) {
      onSubmit(e, selectedImages);
      setSelectedImages([]);
      setIsImagesSent(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (input.trim()) {
      onSubmit(e);
      setSelectedImages([]);
      setIsImagesSent(false);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (selectedImages.length === 1 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {selectedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {selectedImages.map((image, index) => (
            <div key={index} className="relative">
              <img 
                src={image} 
                alt={`Preview ${index + 1}`} 
                className="h-40 w-full rounded-lg object-cover"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-gray-800/50 hover:bg-gray-800/75 text-white rounded-full p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder={isImagesSent ? "Add a message..." : "Type your message..."}
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
            multiple
            className="hidden"
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
        {isLoading ? (
          <button
            type="button"
            onClick={onStopGeneration}
            className="px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
} 