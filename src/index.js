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

import { handleCORS } from './middleware/cors.js';
import { authenticate } from './middleware/auth.js';
import { EventsHandler } from './handlers/events.js';
import { handleGallery } from './handlers/gallery.js';
import { handleBlog } from './handlers/blog.js';
import { handleMenu } from './handlers/menu.js';
import { handleHours } from './handlers/hours.js';
import { handleAdmin } from './handlers/admin.js';
import { handleMigration } from './handlers/migration.js';

export default {
  async fetch(request, env, ctx) {
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
        const eventsHandler = new EventsHandler(env);
        const response = await eventsHandler.handleRequest(request);
        return handleCORS(response);
      }

      if (path.startsWith('/api/blog/public')) {
        const response = await handleBlog(request, env, 'public');
        return handleCORS(response);
      }

      if (path.startsWith('/api/menu/public')) {
        const response = await handleMenu(request, env, 'public');
        return handleCORS(response);
      }

      if (path.startsWith('/api/hours/public')) {
        const response = await handleHours(request, env, 'public');
        return handleCORS(response);
      }

      // Auth endpoints
      if (path.startsWith('/api/auth')) {
        const response = await handleAdmin(request, env, 'auth');
        return handleCORS(response);
      }

      // Admin dashboard (HTML)
      if (path === '/' || path === '/dashboard' || path === '/admin') {
        // Check if user is authenticated for dashboard access
        const authResult = await authenticate(request, env);
        if (!authResult.success) {
          // Redirect to login if not authenticated
          return Response.redirect('/login', 302);
        }
        
        // Serve admin dashboard HTML
        try {
          // In development, we'll inline the HTML content
          // In production, this would be served from KV or R2
          const dashboardHTML = await fetch('https://raw.githubusercontent.com/thuruht/fwhyadmin/main/src/admin-dashboard.html');
          if (dashboardHTML.ok) {
            const html = await dashboardHTML.text();
            return new Response(html, {
              headers: { 'Content-Type': 'text/html' }
            });
          }
        } catch (error) {
          console.error('Error loading dashboard:', error);
        }
        
        // Fallback basic dashboard
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 1200px; margin: 0 auto; }
              .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .btn { padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Farewell/Howdy Admin Dashboard</h1>
                <p>Welcome to the unified admin backend</p>
              </div>
              <div class="card">
                <h2>Quick Actions</h2>
                <a href="#" class="btn">Manage Events</a>
                <a href="#" class="btn">Upload Flyers</a>
                <a href="#" class="btn">Edit Menu</a>
                <a href="#" class="btn">Manage Hours</a>
              </div>
              <div class="card">
                <h2>System Status</h2>
                <p>Backend worker is running successfully.</p>
                <p>API endpoints are ready for frontend integration.</p>
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // Login page
      if (path === '/login') {
        // Serve login page (create if needed)
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Login</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
              .login-form { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 300px; }
              .login-form h2 { margin-bottom: 20px; text-align: center; color: #333; }
              .form-group { margin-bottom: 15px; }
              .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
              .form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
              .btn { width: 100%; padding: 10px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
              .btn:hover { background: #005a87; }
              .error { color: #dc3545; margin-top: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="login-form">
              <h2>Admin Login</h2>
              <form id="loginForm">
                <div class="form-group">
                  <label>Username</label>
                  <input type="text" id="username" required>
                </div>
                <div class="form-group">
                  <label>Password</label>
                  <input type="password" id="password" required>
                </div>
                <button type="submit" class="btn">Login</button>
                <div id="error" class="error" style="display: none;"></div>
              </form>
            </div>
            <script>
              document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('error');
                
                try {
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                  });
                  
                  if (response.ok) {
                    window.location.href = '/dashboard';
                  } else {
                    const error = await response.json();
                    errorDiv.textContent = error.message || 'Login failed';
                    errorDiv.style.display = 'block';
                  }
                } catch (error) {
                  errorDiv.textContent = 'Login failed. Please try again.';
                  errorDiv.style.display = 'block';
                }
              });
            </script>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // Admin endpoints (auth required)
      const authResult = await authenticate(request, env);
      if (!authResult.success) {
        return handleCORS(new Response(
          JSON.stringify({ error: 'Unauthorized' }), 
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // Route authenticated requests
      if (path.startsWith('/api/events')) {
        const eventsHandler = new EventsHandler(env);
        const response = await eventsHandler.handleRequest(request);
        return handleCORS(response);
      }

      if (path.startsWith('/api/gallery')) {
        const action = path.split('/')[3] || 'list';
        const response = await handleGallery(request, env, action);
        return handleCORS(response);
      }

      if (path.startsWith('/api/blog')) {
        const action = path.split('/')[3] || 'list';
        const response = await handleBlog(request, env, action);
        return handleCORS(response);
      }

      if (path.startsWith('/api/menu')) {
        const action = path.split('/')[3] || 'get';
        const response = await handleMenu(request, env, action);
        return handleCORS(response);
      }

      if (path.startsWith('/api/hours')) {
        const action = path.split('/')[3] || 'get';
        const response = await handleHours(request, env, action);
        return handleCORS(response);
      }

      if (path.startsWith('/api/admin')) {
        const action = path.split('/')[3] || 'dashboard';
        const response = await handleAdmin(request, env, action);
        return handleCORS(response);
      }

      // Migration endpoint (admin auth required)
      if (path.startsWith('/api/migrate')) {
        const authResult = await authenticate(request, env);
        if (!authResult.authenticated) {
          return handleCORS(new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }));
        }
        const response = await handleMigration(request, env);
        return handleCORS(response);
      }

      // Default 404
      return handleCORS(new Response(
        JSON.stringify({ error: 'Not Found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));

    } catch (error) {
      console.error('Worker error:', error);
      return handleCORS(new Response(
        JSON.stringify({ error: 'Internal Server Error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }
  }
};
