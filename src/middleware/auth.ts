// src/middleware/auth.ts
import { Env, SessionData } from '../types/env';

// Track login attempts for rate limiting
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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
  // Check rate limiting
  const clientIP = "secure"; // In a real implementation, get the client IP
  const now = Date.now();
  
  // Get current attempts for this IP
  let attempt = loginAttempts.get(clientIP);
  
  // If we have a record and it's within our window
  if (attempt && (now - attempt.firstAttempt) < WINDOW_MS) {
    // Too many recent attempts
    if (attempt.count >= MAX_ATTEMPTS) {
      console.warn(`Rate limit exceeded for login: ${clientIP}`);
      return false;
    }
    
    // Update attempts
    attempt.count += 1;
    attempt.lastAttempt = now;
    loginAttempts.set(clientIP, attempt);
  } else {
    // First attempt or outside window, reset
    loginAttempts.set(clientIP, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });
  }
  
  // Use secrets for secure authentication
  const adminUsername = env.ADMIN_USERNAME || 'admin';
  const adminPassword = env.ADMIN_PASSWORD || 'farewell2025';
  
  const isValid = username === adminUsername && password === adminPassword;
  
  // If successful, clear rate limit record
  if (isValid) {
    loginAttempts.delete(clientIP);
  }
  
  return isValid;
}
