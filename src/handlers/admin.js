/**
 * Admin Handler - Authentication and admin-specific functionality
 */
export async function handleAdmin(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;

  switch (action) {
    case 'auth':
      return handleAuth(request, env);
    case 'dashboard':
      return handleDashboard(request, env);
    default:
      return new Response(
        JSON.stringify({ error: 'Invalid admin action' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path.includes('/login') && method === 'POST') {
    return handleLogin(request, env);
  } else if (path.includes('/logout') && method === 'POST') {
    return handleLogout(request, env);
  } else if (path.includes('/check') && method === 'GET') {
    return handleAuthCheck(request, env);
  }

  return new Response(
    JSON.stringify({ error: 'Invalid auth endpoint' }), 
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // For now, use simple hardcoded credentials
    // In production, this should use proper hashing and database
    const validUsername = env.ADMIN_USERNAME || 'admin';
    const validPassword = env.ADMIN_PASSWORD || 'farewell2025';

    if (username === validUsername && password === validPassword) {
      // Generate a simple session token
      const sessionToken = generateSessionToken();
      
      // Store session in KV (expires in 24 hours)
      const sessionKey = `session:${sessionToken}`;
      await env.SESSIONS_KV?.put(sessionKey, JSON.stringify({
        username,
        created: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }), { expirationTtl: 24 * 60 * 60 }); // 24 hours

      // Set session cookie
      const response = new Response(
        JSON.stringify({ success: true, message: 'Login successful' }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

      response.headers.set('Set-Cookie', `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`);
      
      return response;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Login failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleLogout(request, env) {
  try {
    const sessionToken = getSessionTokenFromRequest(request);
    
    if (sessionToken) {
      // Remove session from KV
      const sessionKey = `session:${sessionToken}`;
      await env.SESSIONS_KV?.delete(sessionKey);
    }

    const response = new Response(
      JSON.stringify({ success: true, message: 'Logout successful' }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Clear session cookie
    response.headers.set('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
    
    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({ error: 'Logout failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleAuthCheck(request, env) {
  try {
    const sessionToken = getSessionTokenFromRequest(request);
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ authenticated: false }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check session in KV
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.SESSIONS_KV?.get(sessionKey);
    
    if (!sessionData) {
      return new Response(
        JSON.stringify({ authenticated: false }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expires < Date.now()) {
      await env.SESSIONS_KV?.delete(sessionKey);
      return new Response(
        JSON.stringify({ authenticated: false }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        authenticated: true, 
        user: { username: session.username } 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(
      JSON.stringify({ authenticated: false }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDashboard(request, env) {
  // Dashboard stats and info
  try {
    const stats = {
      totalEvents: 0,
      upcomingEvents: 0,
      totalFlyers: 0,
      recentActivity: []
    };

    // Get event stats if available
    try {
      const eventsData = await env.EVENTS_KV?.get('events:all');
      if (eventsData) {
        const events = JSON.parse(eventsData);
        stats.totalEvents = events.length;
        stats.upcomingEvents = events.filter(e => new Date(e.date) > new Date()).length;
      }
    } catch (error) {
      console.error('Error loading event stats:', error);
    }

    return new Response(
      JSON.stringify(stats), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load dashboard data' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Utility functions
function generateSessionToken() {
  // Simple session token generation
  // In production, use a more secure method
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
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
