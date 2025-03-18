import ImageCarousel from './ImageCarousel';

interface MessageContentProps {
  message: {
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
  };
}

export default function MessageContent({ message }: MessageContentProps) {
  return (
    <div className="space-y-4">
      {/* Display uploaded images */}
      {message.imageUrls && message.imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {message.imageUrls.map((imageUrl, index) => (
            <div key={index} className="relative">
              <img 
                src={imageUrl} 
                alt={`Uploaded ${index + 1}`} 
                className="h-40 w-full rounded-lg object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Display message content */}
      <div className="text-sm">{message.content}</div>

      {/* Display image carousel for detected objects */}
      {message.detectionResults && message.detectionResults.length > 0 && (
        <ImageCarousel detectionResults={message.detectionResults} />
      )}
    </div>
  );
} 