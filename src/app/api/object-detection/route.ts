import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    console.log('🔍 Object Detection: Starting processing for image');

    // Handle base64 data
    let imageData: ArrayBuffer;
    if (imageUrl.startsWith('data:')) {
      // Extract base64 data from data URL
      const base64Data = imageUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      imageData = bytes.buffer;
      console.log('📦 Object Detection: Base64 data processed');
    } else {
      // Handle regular URL
      console.log('📥 Object Detection: Fetching image from URL...');
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error('❌ Object Detection: Failed to fetch image:', response.status, response.statusText);
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      console.log('✅ Object Detection: Image fetched successfully');
      const blob = await response.blob();
      imageData = await blob.arrayBuffer();
      console.log('📦 Object Detection: Image converted to ArrayBuffer');
    }

    // Use the Inference API client
    console.log('🤖 Object Detection: Sending to Hugging Face API...');
    const detectionResults = await hf.objectDetection({
      model: "facebook/detr-resnet-50",
      data: imageData,
    });
    console.log('✅ Object Detection: Received results from Hugging Face:', detectionResults);

    // Extract labels, scores, and boxes
    const labels = detectionResults.map(result => ({
      label: result.label,
      score: (result.score * 100).toFixed(2),
      box: result.box
    }));
    
    console.log('📊 Object Detection: Processed labels:', labels);
    return Response.json({ 
      results: labels,
      success: true 
    });

  } catch (error) {
    console.error('❌ Object Detection Error:', error);
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