import { NextResponse } from 'next/server';
import { AgentAction, AgentResponse } from '@/lib/types/agent';

const OBJECT_PRICE_MAPPING: { [key: string]: number } = {
  person: 0,
  car: 25000,
  truck: 45000,
  bicycle: 500,
  motorcycle: 8000,
  bus: 100000,
  chair: 150,
  sofa: 1000,
  couch: 1000,
  potted_plant: 100,
  table: 500,
  bed: 800,
  laptop: 1200,
  computer: 1500,
  phone: 800,
  tv: 700,
  book: 15,
  piano: 1000,
  book_shelf: 200
};

export async function POST(req: Request) {
  try {
    // Log the raw request body
    const rawBody = await req.text();
    console.log('📦 Agent: Raw request body:', rawBody);
    
    // Parse the request body
    const body = JSON.parse(rawBody);
    console.log('📝 Agent: Parsed request body:', body);
    
    // Extract the action
    const { action } = body;
    if (!action) {
      console.error('❌ Agent: No action found in request body');
      throw new Error('No action provided in request');
    }
    
    console.log('🤖 Agent: Received action:', action.type);
    console.log('📋 Agent: Action payload:', action.payload);
    
    let response: AgentResponse;

    switch (action.type) {
      case 'detect_objects':
        console.log('🔍 Agent: Processing detect_objects action');
        const { imageUrls } = action.payload;
        if (!imageUrls || !Array.isArray(imageUrls)) {
          console.error('❌ Agent: Invalid imageUrls in payload:', imageUrls);
          throw new Error('Invalid imageUrls provided');
        }
        console.log('📸 Agent: Image URLs to process:', imageUrls);
        
        const detectionResults = await Promise.all(
          imageUrls.map(async (url: string) => {
            console.log('🔄 Agent: Processing image:', url);
            const detectionResponse = await fetch('/api/object-detection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: url }),
            });
            
            if (!detectionResponse.ok) {
              console.error('❌ Agent: Object detection API error:', detectionResponse.status, detectionResponse.statusText);
              throw new Error(`Object detection failed: ${detectionResponse.status} ${detectionResponse.statusText}`);
            }
            
            const result = await detectionResponse.json();
            console.log('✅ Agent: Received detection result for image:', result);
            return result;
          })
        );

        console.log('📊 Agent: All detection results:', detectionResults);
        response = {
          action,
          reasoning: 'Objects detected in images',
          confidence: 0.9,
          detectionResults: detectionResults.map(result => ({
            imageUrl: imageUrls[0], // Using first URL for now
            objects: {
              highConfidence: result.results
                .filter((r: any) => parseFloat(r.score) >= 75)
                .map((r: any) => r.label),
              lowerConfidence: result.results
                .filter((r: any) => parseFloat(r.score) < 75)
                .map((r: any) => ({
                  label: r.label,
                  score: r.score,
                  box: r.box
                }))
            }
          }))
        };
        break;

      case 'estimate_costs':
        const { items } = action.payload;
        const aggregatedItems = items.reduce((acc: any, item: string) => {
          const match = item.match(/^([^(]+)/);
          if (!match) return acc;
          
          const label = match[1].trim().toLowerCase();
          const price = OBJECT_PRICE_MAPPING[label] || 0;
          
          if (price === 0) return acc;
          
          if (!acc[label]) {
            acc[label] = { count: 1, price };
          } else {
            acc[label].count += 1;
          }
          
          return acc;
        }, {});

        const summary = Object.entries(aggregatedItems).map(([name, data]: [string, any]) => ({
          name,
          count: data.count,
          priceEach: data.price,
          totalPrice: data.count * data.price
        }));

        const totalCost = summary.reduce((sum, item) => sum + item.totalPrice, 0);

        response = {
          action,
          reasoning: 'Costs estimated based on detected items',
          confidence: 0.85,
          summary: {
            items: summary,
            totalCost
          }
        };
        break;

      case 'analyze_input':
        const { input } = action.payload;
        response = {
          action,
          reasoning: 'Input analyzed for intent and required actions',
          confidence: 0.95,
          analysis: {
            intent: input.toLowerCase().includes('image') ? 'image_analysis' : 'text_query',
            requiresImages: input.toLowerCase().includes('image'),
            requiresCostEstimation: input.toLowerCase().includes('cost') || input.toLowerCase().includes('price')
          }
        };
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    console.log('✅ Agent: Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 