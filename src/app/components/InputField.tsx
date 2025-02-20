'use client';

interface InputFieldProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
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
  return (
    <form onSubmit={onSubmit} className="flex space-x-2">
      <textarea
        value={input}
        onChange={handleInputChange}
        placeholder="Type your message..."
        className="flex-1 rounded-lg border p-2 dark:bg-gray-800 dark:border-gray-700"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e);
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
        >
          Send
        </button>
      )}
    </form>
  );
} 