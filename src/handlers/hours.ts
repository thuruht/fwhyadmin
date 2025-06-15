// src/handlers/hours.ts
import { Env, OperatingHours, ApiResponse } from '../types/env';

export async function handleHours(request: Request, env: Env, mode: 'public' | 'admin'): Promise<Response> {
  // TODO: Implement hours handlers
  return Response.json({
    success: false,
    error: 'Hours functionality not yet implemented'
  } satisfies ApiResponse, { status: 501 });
}
