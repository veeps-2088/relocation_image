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
}

interface ImageCarouselProps {
  imageUrl: string;
  detectedObjects: DetectedObject[];
}

export default function ImageCarousel({ imageUrl, detectedObjects }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    const img = new Image();

    const drawImage = () => {
      if (!mounted) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Set fixed canvas size
      canvas.width = 400;
      canvas.height = 400;

      // Get current object box
      const box = detectedObjects[currentIndex].box;
      console.log('Current box coordinates:', box);

      // Use box coordinates directly as they are already in pixels
      const sourceX = box.xmin;
      const sourceY = box.ymin;
      const sourceWidth = box.xmax - box.xmin;
      const sourceHeight = box.ymax - box.ymin;

      console.log('Source dimensions:', {
        x: sourceX,
        y: sourceY,
        width: sourceWidth,
        height: sourceHeight,
        imageWidth: img.width,
        imageHeight: img.height
      });

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        // Draw the cropped region centered in the canvas
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
        console.log('Successfully drew image to canvas');

        // Debug: Draw a border around the canvas to make sure we can see it
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.error('Error drawing image:', err);
        setError('Failed to draw image');
      }
    };

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading image:', imageUrl);
        
        const response = await fetch('/api/proxy-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        img.onload = () => {
          if (mounted) {
            console.log('Image loaded:', {
              width: img.width,
              height: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            });
            drawImage();
            setLoading(false);
            URL.revokeObjectURL(blobUrl);
          }
        };

        img.onerror = (e) => {
          console.error('Image load error:', e);
          if (mounted) {
            setError('Failed to load image');
            setLoading(false);
            URL.revokeObjectURL(blobUrl);
          }
        };

        img.src = blobUrl;

      } catch (err) {
        console.error('Error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load image');
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [imageUrl, currentIndex, detectedObjects]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === detectedObjects.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? detectedObjects.length - 1 : prevIndex - 1
    );
  };

  if (detectedObjects.length === 0) return null;

  const currentObject = detectedObjects[currentIndex];

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
            onClick={prevSlide}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Previous image"
            disabled={loading}
          >
            ←
          </button>
          <button
            onClick={nextSlide}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
            disabled={loading}
          >
            →
          </button>
        </div>

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-center z-20">
          <p className="text-sm">
            {currentObject.label} ({parseFloat(currentObject.score).toFixed(1)}% confident)
          </p>
          <p className="text-xs text-gray-300">
            {currentIndex + 1} of {detectedObjects.length}
          </p>
        </div>
      </div>
    </div>
  );
} 