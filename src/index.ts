// src/index.ts
import { Env, ApiResponse } from './types/env';
import { handleCORS } from './utils/cors';
import { authenticate } from './middleware/auth';
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
        return new Response(generateDashboardHTML(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // Login page
      if (path === '/login') {
        return new Response(generateLoginHTML(), {
          headers: { 'Content-Type': 'text/html' }
        });
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
          requestedPath: path 
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
  <title>Admin Login - Farewell/Howdy</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    button { width: 100%; padding: 12px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #005a87; }
    .error { color: red; margin-top: 10px; }
  </style>
</head>
<body>
  <h2>Admin Login</h2>
  <form id="loginForm">
    <div class="form-group">
      <label for="username">Username:</label>
      <input type="text" id="username" name="username" required>
    </div>
    <div class="form-group">
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
    </div>
    <button type="submit">Login</button>
    <div id="error" class="error"></div>
  </form>

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
          window.location.href = '/dashboard';
        } else {
          document.getElementById('error').textContent = result.error || 'Login failed';
        }
      } catch (error) {
        document.getElementById('error').textContent = 'Login request failed';
      }
    });
  </script>
</body>
</html>`;
}
