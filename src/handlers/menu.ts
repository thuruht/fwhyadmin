// src/handlers/menu.ts
import { Env, MenuItem, ApiResponse } from '../types/env';

export async function handleMenu(request: Request, env: Env, mode: 'public' | 'admin'): Promise<Response> {
  // TODO: Implement menu handlers
  return Response.json({
    success: false,
    error: 'Menu functionality not yet implemented'
  } satisfies ApiResponse, { status: 501 });
}
