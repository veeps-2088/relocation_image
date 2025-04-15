import OpenAI from 'openai';
import { Buffer } from 'buffer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

type ImageContent = {
  type: 'image_url';
  image_url: { url: string };
};

type TextContent = {
  type: 'text';
  text: string;
};

type MessageContent = TextContent | ImageContent;

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    console.log('🔍 Object Detection: Starting processing for image');

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    let base64Image: string | undefined;
    
    if (imageUrl.startsWith('data:')) {
      // Image is already in base64 format
      base64Image = imageUrl;
      console.log('📦 Object Detection: Using provided base64 image');
    } else {
      // Fetch image and convert to base64
      console.log('📥 Object Detection: Fetching image from URL:', imageUrl);
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.error('❌ Object Detection: Failed to fetch image:', response.status, response.statusText);
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        base64Image = `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        console.log('📦 Object Detection: Image converted to base64');
      } catch (error) {
        console.error('❌ Object Detection: Error fetching or converting image:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to process image',
            details: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            results: []
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (!base64Image) {
      return new Response(
        JSON.stringify({
          error: 'No valid image data available',
          success: false,
          results: []
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call OpenAI Vision API
    console.log('🤖 Object Detection: Sending to OpenAI Vision API...');
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and identify furniture, electronics, and other household items that would be relevant for a moving cost estimation. For each item, provide a confidence score between 0-100. Return ONLY a JSON array of objects, each with 'label' and 'score' properties. Example: [{\"label\": \"couch\", \"score\": 95}, {\"label\": \"tv\", \"score\": 90}]"
              } as TextContent,
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                }
              } as ImageContent
            ] as MessageContent[]
          }
        ],
        max_tokens: 1000,
      });

      // Parse the response
      const content = completion.choices[0].message.content;
      console.log('📝 OpenAI Response:', content);
      
      let detectedObjects;
      try {
        // Clean the response by removing any markdown code blocks
        const cleanedContent = content?.replace(/```json\n?|\n?```/g, '').trim() || '[]';
        detectedObjects = JSON.parse(cleanedContent);
        if (!Array.isArray(detectedObjects)) {
          console.error('❌ Invalid response format:', content);
          return new Response(
            JSON.stringify({
              error: 'Invalid response format from OpenAI',
              success: false,
              results: []
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (error) {
        console.error('Failed to parse OpenAI response:', content);
        console.error('Parse error:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to parse OpenAI response',
            details: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            results: []
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Format the results to match the expected structure
      const formattedResults = detectedObjects.map((obj: any) => ({
        label: obj.label?.toLowerCase() || 'unknown',
        score: obj.score?.toString() || '0',
        box: {
          xmin: 0,
          ymin: 0,
          xmax: 1,
          ymax: 1
        }
      }));

      console.log('✅ Object Detection: Processed results:', formattedResults);
      return new Response(
        JSON.stringify({
          results: formattedResults,
          success: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      return new Response(
        JSON.stringify({
          error: 'OpenAI API Error',
          details: error instanceof Error ? error.message : 'Unknown error',
          success: false,
          results: []
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ Object Detection Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        results: []
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 