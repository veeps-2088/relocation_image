<<<<<<< HEAD
type ImageClassification = {
  label: string;
  confidence: number;
};

type PriceRange = {
  min: number;
  max: number;
  average: number;
};

// Price mapping for different image classifications
const PRICE_MAPPING: Record<string, PriceRange> = {
  // Furniture
  'chair': { min: 50, max: 500, average: 200 },
  'table': { min: 100, max: 2000, average: 800 },
  'sofa': { min: 300, max: 3000, average: 1200 },
  
  // Electronics
  'laptop': { min: 500, max: 2500, average: 1200 },
  'smartphone': { min: 200, max: 1500, average: 800 },
  'monitor': { min: 150, max: 1000, average: 400 },
  
  // Appliances
  'refrigerator': { min: 500, max: 3000, average: 1500 },
  'microwave': { min: 50, max: 500, average: 200 },
  'washer': { min: 400, max: 2000, average: 800 },
  
  // Default fallback
  'default': { min: 50, max: 500, average: 200 }
};

export function estimateImagePrice(classifications: ImageClassification[]): PriceRange {
  // Sort classifications by confidence
  const sortedClassifications = [...classifications].sort(
    (a, b) => b.confidence - a.confidence
  );

  // Get the highest confidence classification
  const topMatch = sortedClassifications[0];
  
  // If no classifications provided or confidence too low, return default
  if (!topMatch || topMatch.confidence < 0.5) {
    return PRICE_MAPPING.default;
  }

  // Find the most specific category match
  const label = topMatch.label.toLowerCase();
  let matchedCategory = Object.keys(PRICE_MAPPING).find(
    category => label.includes(category)
  );

  // Return matched price range or default
  return PRICE_MAPPING[matchedCategory || 'default'];
}

// Helper function to format price
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
} 
=======
 
>>>>>>> d2f2ab7 (update cost estimator)
