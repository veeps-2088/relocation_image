export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    console.log('Proxy: Received request for image:', imageUrl);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Proxy: Failed to fetch image:', response.status, response.statusText);
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    console.log('Proxy: Image content type:', contentType);
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('Proxy: Image size:', arrayBuffer.byteLength, 'bytes');

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to proxy image',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
} 