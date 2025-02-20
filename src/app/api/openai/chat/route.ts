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
    console.log('API received request:', body);
    
    const { messages, data } = body;

    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If there's an image, add it to the system message
    let systemMessage = "You are a helpful AI assistant.";
    if (data?.imageUrl) {
      systemMessage += " The user has shared an image with you.";
    }

    // Prepare messages for OpenAI
    const apiMessages = [
      { role: 'system', content: systemMessage },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content || ''
      }))
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: apiMessages,
      temperature: 0.7,
      stream: true,
    });

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
