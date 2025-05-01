import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionCreateParams } from 'openai/resources/chat/completions';

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Set the runtime to edge for best performance
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('API route received request:', JSON.stringify(body, null, 2));
    
    const { messages, data } = body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Only try to parse data if it exists
    let imageUrl, description;
    if (data) {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      imageUrl = parsedData.imageUrl;
      description = parsedData.detectedObjects;
    }

    // Create a dynamic system message based on context
    let systemMessage = "You are a helpful AI assistant that helps people estimate moving costs. Keep all responses extremely concise - 2-3 sentences maximum.";
    if (imageUrl && description) {
      systemMessage += ` The user has shared an image with you. The following objects were detected: ${description}. 
      Please provide brief information about these items, focusing on key moving costs and essential handling considerations.`;
    }

    // Prepare messages for OpenAI with proper structure
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content || ''
      }))
    ];

    console.log('Sending to OpenAI with messages:', JSON.stringify(apiMessages, null, 2));
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: apiMessages,
      temperature: 0.7,
      stream: true,
    });

    // Note: The type error below is a known issue between OpenAI and Vercel AI SDK types
    // The streaming functionality works correctly at runtime despite the TypeScript error
    // @ts-ignore - Type mismatch between OpenAI and Vercel AI SDK types
    const stream = OpenAIStream(response);
    
    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream);
    
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error processing your request',
        details: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
