'use client';

import ImageUpload from './ImageUpload';
import { useState } from 'react';

interface InputFieldProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent, imageUrl?: string) => void;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageSent, setIsImageSent] = useState(false);

  const handleImageChange = async (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSelectedImage(dataUrl);
        setIsImageSent(false); // Reset when new image is selected
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
    }
  };

  const handleSubmitWithImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImage && !isImageSent) {
      // If there's an unset image, send it first
      onSubmit(e, selectedImage);
      setIsImageSent(true);
    } else if (input.trim() || (selectedImage && !isImageSent)) {
      // Send text message or both text + image
      onSubmit(e, !isImageSent ? selectedImage : undefined);
      setSelectedImage(null);
      setIsImageSent(false);
    }
  };

  return (
    <div className="space-y-4">
      <ImageUpload onImageChange={handleImageChange} />
      {selectedImage && !isImageSent && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
          <span className="text-sm text-blue-600 dark:text-blue-400">
            Image ready to send
          </span>
          <button
            onClick={(e) => handleSubmitWithImage(e)}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            Send Image
          </button>
        </div>
      )}
      <form onSubmit={handleSubmitWithImage} className="flex space-x-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder={isImageSent ? "Add a message..." : "Type your message..."}
          className="flex-1 rounded-lg border p-2 dark:bg-gray-800 dark:border-gray-700"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitWithImage(e);
            }
          }}
        />
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
            disabled={(!input.trim() && !selectedImage) || isLoading}
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
} 