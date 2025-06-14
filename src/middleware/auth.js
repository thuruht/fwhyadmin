/**
 * Authentication Middleware
 * Handles admin authentication for the unified backend
 */

export async function authenticate(request, env) {
  try {
    // Check for session cookie first
    const sessionToken = getSessionTokenFromRequest(request);
    if (sessionToken) {
      const sessionResult = await validateSession(sessionToken, env);
      if (sessionResult.success) {
        return sessionResult;
      }
    }

    // Fallback to Authorization header for API access
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return await validateApiToken(token, env);
    }

    return { success: false, error: 'No valid authentication provided' };

  } catch (error) {
    console.error('Auth error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

async function validateSession(sessionToken, env) {
  try {
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.SESSIONS_KV?.get(sessionKey);
    
    if (!sessionData) {
      return { success: false, error: 'Invalid session' };
    }

    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expires < Date.now()) {
      await env.SESSIONS_KV?.delete(sessionKey);
      return { success: false, error: 'Session expired' };
    }

    return { 
      success: true, 
      user: { 
        id: session.username,
        username: session.username,
        role: 'admin',
        venues: ['farewell', 'howdy'] 
      } 
    };

  } catch (error) {
    console.error('Session validation error:', error);
    return { success: false, error: 'Session validation failed' };
  }
}

async function validateApiToken(token, env) {
  try {
    // For API access, check stored tokens in KV
    const tokenKey = `api_token:${token}`;
    const tokenData = await env.SESSIONS_KV?.get(tokenKey);
    
    if (!tokenData) {
      // Check for hardcoded admin token for development
      const adminToken = env.ADMIN_API_TOKEN || 'dev-admin-token-2025';
      if (token === adminToken) {
        return { 
          success: true, 
          user: { 
            id: 'api-admin',
            role: 'admin',
            venues: ['farewell', 'howdy'] 
          } 
        };
      }
      
      return { success: false, error: 'Invalid API token' };
    }

    const tokenInfo = JSON.parse(tokenData);
    
    // Check if token is expired
    if (tokenInfo.expires && Date.now() > tokenInfo.expires) {
      await env.SESSIONS_KV?.delete(tokenKey);
      return { success: false, error: 'API token expired' };
    }

    return { 
      success: true, 
      user: tokenInfo.user 
    };

  } catch (error) {
    console.error('API token validation error:', error);
    return { success: false, error: 'API token validation failed' };
  }
}

function getSessionTokenFromRequest(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  return cookies.session || null;
}
