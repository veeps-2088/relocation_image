'use client';

import { estimateImagePrice, formatPrice } from '@/lib/utils/priceEstimator';

type Props = {
  classifications: Array<{ label: string; confidence: number }>;
};

export default function ImagePriceEstimator({ classifications }: Props) {
  const priceRange = estimateImagePrice(classifications);

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h3 className="text-lg font-semibold mb-3">Estimated Price Range</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Range:</span>
          <span className="font-medium">
            {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Average:</span>
          <span className="font-medium">{formatPrice(priceRange.average)}</span>
        </div>
      </div>
    </div>
  );
} 