/**
 * Gallery Handler
 * Manages flyer images and gallery functionality
 */

export async function handleGallery(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    switch (action) {
      case 'list':
        return await listGalleryItems(request, env);
      case 'upload':
        return await uploadGalleryItem(request, env);
      case 'delete':
        return await deleteGalleryItem(request, env);
      case 'flyer':
        return await serveFlyer(request, env);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Gallery handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Gallery operation failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function listGalleryItems(request, env) {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') || 'all';
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const offset = parseInt(url.searchParams.get('offset')) || 0;

  try {
    // List all flyer keys
    const flyerKeys = await env.GALLERY_KV.list({ prefix: 'flyers:' });
    
    let flyers = [];
    
    // Get flyer metadata
    for (const key of flyerKeys.keys) {
      try {
        const metadata = await env.GALLERY_KV.getWithMetadata(key.name);
        if (metadata.metadata) {
          const flyerInfo = {
            filename: key.name.replace('flyers:', ''),
            ...metadata.metadata,
            url: `/api/gallery/flyer/${key.name.replace('flyers:', '')}`,
            size: key.size
          };
          
          // Filter by venue if specified
          if (venue === 'all' || flyerInfo.venue === venue) {
            flyers.push(flyerInfo);
          }
        }
      } catch (error) {
        console.error('Error getting flyer metadata:', error);
      }
    }

    // Sort by upload date (newest first)
    flyers.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

    // Apply pagination
    const paginatedFlyers = flyers.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        flyers: paginatedFlyers,
        total: flyers.length,
        offset,
        limit
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('List gallery items error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list gallery items' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function uploadGalleryItem(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const venue = formData.get('venue') || 'farewell';
    const title = formData.get('title') || '';
    const description = formData.get('description') || '';

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only images are allowed.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${venue}-${timestamp}-${sanitizedOriginalName}`;
    
    // Store file with metadata
    const fileBuffer = await file.arrayBuffer();
    const metadata = {
      venue,
      title,
      description,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploaded: new Date().toISOString()
    };

    await env.GALLERY_KV.put(`flyers:${filename}`, fileBuffer, {
      metadata: metadata
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        filename,
        url: `/api/gallery/flyer/${filename}`,
        metadata,
        message: 'File uploaded successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload gallery item error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function deleteGalleryItem(request, env) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');

    if (!filename) {
      return new Response(
        JSON.stringify({ error: 'Filename required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const key = `flyers:${filename}`;
    
    // Check if file exists
    const existingFile = await env.GALLERY_KV.get(key);
    if (!existingFile) {
      return new Response(
        JSON.stringify({ error: 'File not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the file
    await env.GALLERY_KV.delete(key);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'File deleted successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete gallery item error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete file' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function serveFlyer(request, env) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];

    if (!filename) {
      return new Response('Filename required', { status: 400 });
    }

    const key = `flyers:${filename}`;
    const fileData = await env.GALLERY_KV.getWithMetadata(key, 'arrayBuffer');
    
    if (!fileData.value) {
      return new Response('File not found', { status: 404 });
    }

    const headers = {
      'Content-Type': fileData.metadata?.mimeType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'Content-Length': fileData.value.byteLength.toString()
    };

    return new Response(fileData.value, { headers });

  } catch (error) {
    console.error('Serve flyer error:', error);
    return new Response('Failed to serve file', { status: 500 });
  }
}
