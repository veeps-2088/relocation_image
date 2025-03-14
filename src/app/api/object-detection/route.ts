import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    console.log('Processing image with Hugging Face...');

    // Convert base64 to Blob
    const base64Response = await fetch(imageUrl);
    const blob = await base64Response.blob();

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();

    // Use the Inference API client
    const detectionResults = await hf.objectDetection({
      model: "facebook/detr-resnet-50",
      data: arrayBuffer,
    });

    console.log('Raw detection results:', detectionResults);

    // Extract labels, scores, and boxes
    const labels = detectionResults.map(result => ({
      label: result.label,
      score: (result.score * 100).toFixed(2),
      box: result.box
    }));
    
    console.log('Extracted labels:', labels);
    return Response.json({ 
      results: labels,
      success: true 
    });

  } catch (error) {
    console.error('Object detection error:', error);
    return Response.json(
      { 
        error: 'Failed to process image', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        results: [] 
      },
      { status: 500 }
    );
  }
} 