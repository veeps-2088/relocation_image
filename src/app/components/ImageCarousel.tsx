'use client';

import { useState, useEffect, useRef } from 'react';

interface DetectedObject {
  label: string;
  score: string;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  confirmed?: boolean; // Add confirmation status
}

interface ImageCarouselProps {
  detectionResults: Array<{
    imageUrl: string;
    objects: {
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
  onObjectConfirmation?: (confirmations: Array<{
    label: string;
    score: string;
    confirmed: boolean;
    imageUrl: string;
  }>) => void;
}

export default function ImageCarousel({ detectionResults, onObjectConfirmation }: ImageCarouselProps) {
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmedObjects, setConfirmedObjects] = useState<Map<number, boolean>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentImageRef = useRef<HTMLImageElement | null>(null);
  const mounted = useRef(true);
  const [isComplete, setIsComplete] = useState(false);

  // Flatten all lower confidence objects with their corresponding image URLs
  const allObjects = detectionResults.flatMap((result) => 
    result.objects.lowerConfidence.map(obj => ({
      ...obj,
      imageUrl: result.imageUrl
    }))
  );

  // Early return if no objects found
  if (allObjects.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto mt-2 p-4 text-center text-gray-600 bg-gray-100 rounded-lg">
        <p>No objects detected with confidence level between 50-74%</p>
        <p className="text-sm mt-2">
          {detectionResults.length > 0 
            ? 'All detected objects are outside this confidence range'
            : 'No objects detected in the images'}
        </p>
      </div>
    );
  }

  // Handle object confirmation
  const handleConfirmation = (confirmed: boolean) => {
    setConfirmedObjects(prev => {
      const newConfirmations = new Map(prev);
      newConfirmations.set(currentObjectIndex, confirmed);
      
      // Debug log for confirmation
      console.log('Confirming object:', {
        label: allObjects[currentObjectIndex].label,
        score: allObjects[currentObjectIndex].score,
        confirmed: confirmed,
        index: currentObjectIndex
      });

      // If this is a "Yes" confirmation, send it immediately
      if (confirmed && onObjectConfirmation) {
        const confirmedObject = {
          label: allObjects[currentObjectIndex].label,
          score: allObjects[currentObjectIndex].score,
          confirmed: true,
          imageUrl: allObjects[currentObjectIndex].imageUrl
        };
        console.log('Sending immediate confirmation:', confirmedObject);
        onObjectConfirmation([confirmedObject]);
      }
      
      // If this was the last object, mark as complete
      if (currentObjectIndex === allObjects.length - 1 || newConfirmations.size === allObjects.length) {
        setIsComplete(true);
      }
      
      return newConfirmations;
    });

    // Move to next object if available
    if (currentObjectIndex < allObjects.length - 1) {
      setCurrentObjectIndex(prev => prev + 1);
    }
  };

  const drawImage = () => {
    if (!currentImageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentObject = allObjects[currentObjectIndex];
    const box = currentObject.box;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Calculate dimensions
    const sourceWidth = box.xmax - box.xmin;
    const sourceHeight = box.ymax - box.ymin;
    const aspectRatio = sourceWidth / sourceHeight;

    // Calculate destination dimensions
    let destWidth = canvas.width;
    let destHeight = canvas.height;
    
    if (aspectRatio > 1) {
      destHeight = canvas.width / aspectRatio;
    } else {
      destWidth = canvas.height * aspectRatio;
    }

    // Calculate centering offsets
    const offsetX = (canvas.width - destWidth) / 2;
    const offsetY = (canvas.height - destHeight) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Draw the image
      ctx.drawImage(
        currentImageRef.current,
        box.xmin,
        box.ymin,
        sourceWidth,
        sourceHeight,
        offsetX,
        offsetY,
        destWidth,
        destHeight
      );

      // Draw border
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX, offsetY, destWidth, destHeight);
    } catch (err) {
      console.error('Error drawing image:', err);
      if (mounted.current) {
        setError('Failed to draw image');
      }
    }
  };

  useEffect(() => {
    mounted.current = true;

    const loadAndDrawImage = async () => {
      if (!mounted.current) return;
      
      try {
        setLoading(true);
        setError(null);

        const currentObject = allObjects[currentObjectIndex];
        
        const response = await fetch('/api/proxy-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: currentObject.imageUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Create new image
        const img = new Image();
        
        img.onload = () => {
          if (!mounted.current) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          currentImageRef.current = img;
          drawImage();
          setLoading(false);
          URL.revokeObjectURL(blobUrl);
        };

        img.onerror = () => {
          if (!mounted.current) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          setError('Failed to load image');
          setLoading(false);
          URL.revokeObjectURL(blobUrl);
        };

        img.src = blobUrl;

      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to load image');
          setLoading(false);
        }
      }
    };

    loadAndDrawImage();

    return () => {
      mounted.current = false;
    };
  }, [currentObjectIndex]); // Remove allObjects from dependencies

  const currentObject = allObjects[currentObjectIndex];
  const isConfirmed = confirmedObjects.has(currentObjectIndex);

  if (isComplete) {
    return (
      <div className="w-full max-w-sm mx-auto mt-2 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-700 font-medium mb-2">
          ✓ All objects have been reviewed!
        </p>
        <p className="text-sm text-gray-600">
          Please type "show summary" to see your updated moving cost estimate.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto mt-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center z-10">
            <div>
              <p className="font-bold mb-2">Error loading image:</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Navigation buttons */}
        <div className="absolute inset-0 flex items-center justify-between p-2 z-20">
          <button
            onClick={() => setCurrentObjectIndex(prev => prev === 0 ? allObjects.length - 1 : prev - 1)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Previous image"
            disabled={loading}
          >
            ←
          </button>
          <button
            onClick={() => setCurrentObjectIndex(prev => prev === allObjects.length - 1 ? 0 : prev + 1)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
            disabled={loading}
          >
            →
          </button>
        </div>

        {/* Caption and confirmation buttons */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-center z-20">
          <p className="text-sm mb-2">
            {currentObject.label} ({parseFloat(currentObject.score).toFixed(1)}% confident)
          </p>
          
          {!isConfirmed && !loading && (
            <div className="flex justify-center space-x-2 mb-2">
              <button
                onClick={() => handleConfirmation(true)}
                className="px-4 py-1 bg-green-500 hover:bg-green-600 rounded-full text-sm font-medium transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleConfirmation(false)}
                className="px-4 py-1 bg-red-500 hover:bg-red-600 rounded-full text-sm font-medium transition-colors"
              >
                No
              </button>
            </div>
          )}

          {isConfirmed && (
            <p className="text-sm text-green-400">
              ✓ Confirmed: {confirmedObjects.get(currentObjectIndex) ? 'Yes' : 'No'}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="bg-blue-600 h-2 transition-all duration-300"
          style={{ width: `${(confirmedObjects.size / allObjects.length) * 100}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-500 mt-1">
        {confirmedObjects.size} of {allObjects.length} objects reviewed
      </p>
    </div>
  );
} 