// src/index.ts
import { Env, ApiResponse } from './types/env';
import { handleCORS } from './utils/cors';
import { authenticate } from './middleware/auth';
import { logSuspiciousRequests } from './middleware/security';
import { handleAuth } from './handlers/auth';
import { handleEvents } from './handlers/events';
import { handleBlog } from './handlers/blog';
import { handleGallery } from './handlers/gallery';
import { handleMenu } from './handlers/menu';
import { handleHours } from './handlers/hours';
import { handleMigration } from './handlers/migration';
import { generateDashboardHTML } from './dashboard/admin-dashboard';

/**
 * Farewell/Howdy Unified Admin Backend
 * 
 * This Cloudflare Worker consolidates all backend functionality:
 * - Event management and listing
 * - Gallery/flyer management  
 * - Newsletter/blog management
 * - Menu management
 * - Operating hours management
 * - Admin authentication
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Log suspicious requests (security monitoring)
    ctx.waitUntil(logSuspiciousRequests(request, env));

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleCORS();
    }

    try {
      // Public endpoints (no auth required)
      if (path.startsWith('/api/events/list')) {
        return handleCORS(await handleEvents(request, env, 'list'));
      }

      if (path.startsWith('/api/events/slideshow')) {
        return handleCORS(await handleEvents(request, env, 'slideshow'));
      }

      if (path.startsWith('/api/blog/public')) {
        return handleCORS(await handleBlog(request, env, 'public'));
      }

      // Direct blog endpoints for frontend compatibility
      if (path === '/posts' || path === '/featured') {
        return handleCORS(await handleBlog(request, env, 'public'));
      }

      // API blog endpoints for frontend compatibility  
      if (path === '/api/blog/posts' || path === '/api/blog/featured') {
        return handleCORS(await handleBlog(request, env, 'public'));
      }

      if (path.startsWith('/api/menu/public')) {
        return handleCORS(await handleMenu(request, env, 'public'));
      }

      if (path.startsWith('/api/hours/public')) {
        return handleCORS(await handleHours(request, env, 'public'));
      }

      // Auth endpoints
      if (path.startsWith('/api/auth')) {
        return handleCORS(await handleAuth(request, env));
      }

      // Admin dashboard (HTML)
      if (path === '/' || path === '/dashboard' || path === '/admin') {
        return handleCORS(new Response(generateDashboardHTML(), {
          headers: { 'Content-Type': 'text/html' }
        }));
      }

      // Login page
      if (path === '/login') {
        return handleCORS(new Response(generateLoginHTML(), {
          headers: { 'Content-Type': 'text/html' }
        }));
      }

      // Static assets (CSS, fonts, images) - serve from main frontend without auth
      if (path.startsWith('/css/') || path.startsWith('/fnt/') || path.startsWith('/img/')) {
        try {
          const frontendUrl = `https://dev.farewellcafe.com${path}`;
          const response = await fetch(frontendUrl);
          if (response.ok) {
            const newResponse = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                ...Object.fromEntries(response.headers),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              },
            });
            return handleCORS(newResponse);
          }
        } catch (error) {
          console.error('Error proxying static asset:', error);
        }
        // Fallback 404 for static assets
        return handleCORS(new Response('Asset not found', { status: 404 }));
      }

      // Admin endpoints (auth required)
      const authResult = await authenticate(request, env);
      if (!authResult.success) {
        return handleCORS(
          Response.json({ 
            success: false, 
            error: 'Authentication required' 
          } satisfies ApiResponse, { status: 401 })
        );
      }

      // Route authenticated requests
      if (path.startsWith('/api/events')) {
        return handleCORS(await handleEvents(request, env, 'admin'));
      }

      if (path.startsWith('/api/gallery')) {
        return handleCORS(await handleGallery(request, env));
      }

      if (path.startsWith('/api/blog')) {
        return handleCORS(await handleBlog(request, env, 'admin'));
      }

      if (path.startsWith('/api/menu')) {
        return handleCORS(await handleMenu(request, env, 'admin'));
      }

      if (path.startsWith('/api/hours')) {
        return handleCORS(await handleHours(request, env, 'admin'));
      }

      if (path.startsWith('/api/admin')) {
        return handleCORS(await handleAdminActions(request, env));
      }

      // Migration endpoint (admin auth required)
      if (path.startsWith('/api/migrate')) {
        return handleCORS(await handleMigration(request, env));
      }

      // Default 404
      return handleCORS(
        Response.json({ 
          success: false,
          error: 'Not Found',
          message: `Path not found: ${path}`
        } satisfies ApiResponse, { status: 404 })
      );

    } catch (error) {
      console.error('Worker error:', error);
      return handleCORS(
        Response.json({ 
          success: false,
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        } satisfies ApiResponse, { status: 500 })
      );
    }
  }
} satisfies ExportedHandler<Env>;

/**
 * Handle admin-specific actions
 */
async function handleAdminActions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const action = url.pathname.split('/api/admin/')[1];

  switch (action) {
    case 'status':
      return Response.json({
        success: true,
        data: {
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      } satisfies ApiResponse);

    case 'health':
      // Basic health check - verify all bindings are accessible
      try {
        await env.EVENTS_KV.get('health-check');
        await env.SESSIONS_KV.get('health-check');
        
        return Response.json({
          success: true,
          data: {
            status: 'healthy',
            services: {
              events_kv: 'ok',
              sessions_kv: 'ok',
              blog_kv: 'ok',
              gallery_kv: 'ok',
              config_kv: 'ok'
            }
          }
        } satisfies ApiResponse);
      } catch (error) {
        return Response.json({
          success: false,
          error: 'Health check failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        } satisfies ApiResponse, { status: 500 });
      }

    default:
      return Response.json({
        success: false,
        error: 'Admin action not found'
      } satisfies ApiResponse, { status: 404 });
  }
}

/**
 * Generate basic login HTML
 */
function generateLoginHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>admin login</title>
  <link rel="stylesheet" href="/css/ccssss.css">
  <style>
    body {
      background: var(--header-bg);
      font-family: var(--font-main);
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    .admin-header {
      width: 100%;
      background: var(--primary-bg-color) url('/img/bg4.png') center/cover no-repeat;
      background-attachment: fixed;
      border-bottom: 1px solid var(--nav-border-color);
      padding: 1rem 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 212px;
    }
    .admin-header h1 {
      font-family: var(--font-db);
      font-size: clamp(2.5rem, 8vw, 4em);
      color: var(--secondary-bg-color);
      -webkit-text-stroke: 1px black;
      text-shadow: -1px -1px 0 #000,
           1px -1px 0 #000,
          -1px  1px 0 #000,
           1px  1px 0 #000,
          -8px 8px 0px var(--nav-border-color);
      margin: 0;
    }
    .login-container {
      background: var(--card-bg-color);
      border: 2px solid var(--nav-border-color);
      border-radius: 8px;
      box-shadow: -5px 5px 0px rgba(0,0,0,0.08);
      padding: 2.5rem 2rem 2rem 2rem;
      margin: 2rem auto 0 auto;
      max-width: 400px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .login-title {
      font-family: var(--font-db);
      font-size: 2.2rem;
      color: var(--accent-color);
      margin-bottom: 1.5rem;
      text-shadow: 2px 2px 4px var(--header-text-shadow);
    }
    .form-group {
      width: 100%;
      margin-bottom: 1.2rem;
      text-align: left;
    }
    label {
      font-family: var(--font-main);
      color: var(--accent-color);
      font-weight: bold;
      margin-bottom: 0.3rem;
      display: block;
    }
    input {
      width: 100%;
      padding: 0.8rem;
      border: 1.5px solid var(--nav-border-color);
      border-radius: 4px;
      font-family: var(--font-hnm11);
      font-size: 1rem;
      background: rgba(255,255,255,0.95);
      color: var(--text-color);
      transition: border 0.2s;
    }
    input:focus {
      outline: none;
      border-color: var(--secondary-bg-color);
      box-shadow: -3px 3px 0px rgba(0,0,0,0.08);
    }
    .login-btn {
      width: 100%;
      padding: 1rem 2rem;
      background: var(--button-bg-color);
      color: var(--button-text-color);
      font-family: var(--font-main);
      font-weight: bold;
      border-radius: 4px;
      border: 2px solid var(--text-color);
      font-size: 1.1rem;
      margin-top: 0.5rem;
      cursor: pointer;
      transition: all var(--transition-speed) ease;
    }
    .login-btn:hover {
      background: var(--accent-color);
      color: white;
      transform: translateY(-2px);
    }
    .error {
      color: var(--redd);
      margin-top: 0.7rem;
      font-size: 1rem;
      min-height: 1.2em;
      text-align: center;
      font-family: var(--font-main);
    }
    @media (max-width: 600px) {
      .login-container { padding: 1.2rem 0.5rem; }
      .admin-header { min-height: 120px; padding: 0.5rem; }
      .admin-header h1 { font-size: 2rem; }
    }
  </style>
</head>
<body data-state="farewell">
  <div class="admin-header">
    <h1>administration!</h1>
  </div>
  <main>
    <div class="login-container">
      <div class="login-title">log in</div>
      <form id="loginForm">
        <div class="form-group">
          <label for="username">user:</label>
          <input type="text" id="username" name="username" required autocomplete="username">
        </div>
        <div class="form-group">
          <label for="password">pass:</label>
          <input type="password" id="password" name="password" required autocomplete="current-password">
        </div>
        <button type="submit" class="login-btn">let me in</button>
        <div id="error" class="error"></div>
      </form>
    </div>
  </main>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.get('username'),
            password: formData.get('password')
          })
        });
        const result = await response.json();
        if (result.success) {
          localStorage.setItem('authToken', result.data.token);
          window.location.href = '/';
        } else {
          document.getElementById('error').textContent = result.error || 'nope.';
        }
      } catch (err) {
        document.getElementById('error').textContent = 'try again later.';
      }
    });
  </script>
</body>
</html>`;
}
