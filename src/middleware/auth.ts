// src/middleware/auth.ts
import { Env, SessionData } from '../types/env';

export interface AuthResult {
  success: boolean;
  user?: SessionData;
  error?: string;
}

/**
 * Authenticate a request using session tokens
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization token provided' };
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    // Validate token format
    if (!token || token.length < 10) {
      return { success: false, error: 'Invalid token format' };
    }

    // Check if session exists in KV
    const sessionData = await env.SESSIONS_KV.get(`session:${token}`);
    if (!sessionData) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Parse session data
    const session: SessionData = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expires < Date.now()) {
      // Clean up expired session
      await env.SESSIONS_KV.delete(`session:${token}`);
      return { success: false, error: 'Session expired' };
    }

    return { success: true, user: session };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Create a new session token
 */
export async function createSession(username: string, env: Env): Promise<string> {
  const token = crypto.randomUUID();
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  const sessionData: SessionData = {
    userId: token,
    username,
    role: 'admin',
    expires
  };

  // Store session in KV with TTL
  await env.SESSIONS_KV.put(
    `session:${token}`, 
    JSON.stringify(sessionData),
    { expirationTtl: 24 * 60 * 60 } // 24 hours in seconds
  );

  return token;
}

/**
 * Validate admin credentials
 */
export async function validateCredentials(username: string, password: string, env: Env): Promise<boolean> {
  // For now, use a simple hardcoded check
  // In production, this should check against a secure user database
  const validUsers = {
    'admin': env.ADMIN_PASSWORD || 'farewell2025',
    'farewell': env.ADMIN_PASSWORD || 'farewell2025',
    'howdy': env.ADMIN_PASSWORD || 'howdy2025'
  };

  return validUsers[username as keyof typeof validUsers] === password;
}
