// src/handlers/gallery.ts
import { Env, GalleryItem, ApiResponse } from '../types/env';

export async function handleGallery(request: Request, env: Env): Promise<Response> {
  // TODO: Implement gallery handlers
  return Response.json({
    success: false,
    error: 'Gallery functionality not yet implemented'
  } satisfies ApiResponse, { status: 501 });
}
