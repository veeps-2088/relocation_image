import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Set the runtime to edge for best performance
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('API route received request');
    
    const { messages, data } = body;
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    console.log('Parsed data:', parsedData);
    const { imageUrl, description } = parsedData;

    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If there's an image, add it to the system message
    let systemMessage = "You are a helpful AI assistant.";
    if (imageUrl) {
      systemMessage += ` The user has shared an image with you. ${description}`;
    }

    // Prepare messages for OpenAI
    const apiMessages = [
      { role: 'system', content: systemMessage },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content || ''
      }))
    ];

    console.log('Sending to OpenAI with system message:', systemMessage);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: apiMessages,
      temperature: 0.7,
      stream: true,
    });

    console.log('OpenAI response received, streaming back to client');
    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
    
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error processing your request',
        details: error.message 
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
