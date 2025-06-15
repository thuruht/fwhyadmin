// src/handlers/auth.ts
import { Env, ApiResponse } from '../types/env';
import { validateCredentials, createSession } from '../middleware/auth';

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.split('/api/auth/')[1];

  switch (endpoint) {
    case 'login':
      return handleLogin(request, env);
    case 'logout':
      return handleLogout(request, env);
    case 'verify':
      return handleVerify(request, env);
    default:
      return Response.json({
        success: false,
        error: 'Auth endpoint not found'
      } satisfies ApiResponse, { status: 404 });
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({
      success: false,
      error: 'Method not allowed'
    } satisfies ApiResponse, { status: 405 });
  }

  try {
    const body = await request.json() as { username: string; password: string };
    
    if (!body.username || !body.password) {
      return Response.json({
        success: false,
        error: 'Username and password required'
      } satisfies ApiResponse, { status: 400 });
    }

    // Validate credentials
    const isValid = await validateCredentials(body.username, body.password, env);
    
    if (!isValid) {
      return Response.json({
        success: false,
        error: 'Invalid credentials'
      } satisfies ApiResponse, { status: 401 });
    }

    // Create session
    const token = await createSession(body.username, env);
    
    return Response.json({
      success: true,
      data: {
        token,
        username: body.username,
        expires: Date.now() + (24 * 60 * 60 * 1000)
      }
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({
      success: false,
      error: 'Login failed'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // Delete session from KV
      await env.SESSIONS_KV.delete(`session:${token}`);
    }

    return Response.json({
      success: true,
      message: 'Logged out successfully'
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Logout error:', error);
    return Response.json({
      success: false,
      error: 'Logout failed'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({
        success: false,
        error: 'No token provided'
      } satisfies ApiResponse, { status: 401 });
    }

    const token = authHeader.slice(7);
    const sessionData = await env.SESSIONS_KV.get(`session:${token}`);
    
    if (!sessionData) {
      return Response.json({
        success: false,
        error: 'Invalid token'
      } satisfies ApiResponse, { status: 401 });
    }

    const session = JSON.parse(sessionData);
    
    if (session.expires < Date.now()) {
      await env.SESSIONS_KV.delete(`session:${token}`);
      return Response.json({
        success: false,
        error: 'Token expired'
      } satisfies ApiResponse, { status: 401 });
    }

    return Response.json({
      success: true,
      data: {
        username: session.username,
        role: session.role,
        expires: session.expires
      }
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Verify error:', error);
    return Response.json({
      success: false,
      error: 'Token verification failed'
    } satisfies ApiResponse, { status: 500 });
  }
}
