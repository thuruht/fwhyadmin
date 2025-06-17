// src/middleware/security.ts
import { Env } from '../types/env';

// Paths that might indicate security scanning or malicious intent
const SUSPICIOUS_PATHS = [
  '/.env',
  '/wp-login',
  '/wp-admin',
  '/.git',
  '/config',
  '/admin/config',
  '/api/config',
  '/api/v1/config',
  '/phpinfo',
  '/admin/phpinfo'
];

/**
 * Log suspicious requests to help identify potential security threats
 */
export async function logSuspiciousRequests(request: Request, env: Env): Promise<void> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Check if path matches any suspicious patterns
  const isSuspicious = SUSPICIOUS_PATHS.some(suspiciousPath => 
    path.includes(suspiciousPath) || path.toLowerCase().includes(suspiciousPath.toLowerCase())
  );
  
  if (isSuspicious) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    
    console.warn(`⚠️ Suspicious request detected:
      Path: ${path}
      IP: ${clientIP}
      User-Agent: ${userAgent}
      Method: ${request.method}
      Time: ${new Date().toISOString()}`
    );
    
    // In a production system, you might want to store these logs
    // in a KV store or another persistent storage
  }
}
