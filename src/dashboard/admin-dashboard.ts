// src/dashboard/admin-dashboard.ts

export function generateDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - Farewell/Howdy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: #f5f5f5; 
      color: #333;
    }
    .header { 
      background: #2c3e50; 
      color: white; 
      padding: 1rem 2rem; 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 { font-size: 1.5rem; }
    .logout-btn { 
      background: #e74c3c; 
      color: white; 
      border: none; 
      padding: 0.5rem 1rem; 
      border-radius: 4px; 
      cursor: pointer;
    }
    .logout-btn:hover { background: #c0392b; }
    .container { 
      max-width: 1200px; 
      margin: 2rem auto; 
      padding: 0 2rem; 
    }
    .dashboard-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
      gap: 2rem; 
      margin-bottom: 2rem;
    }
    .card { 
      background: white; 
      border-radius: 8px; 
      padding: 1.5rem; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .card:hover { transform: translateY(-2px); }
    .card h3 { 
      color: #2c3e50; 
      margin-bottom: 1rem; 
      border-bottom: 2px solid #3498db; 
      padding-bottom: 0.5rem;
    }
    .card p { 
      color: #666; 
      line-height: 1.6; 
      margin-bottom: 1rem;
    }
    .btn { 
      background: #3498db; 
      color: white; 
      border: none; 
      padding: 0.75rem 1.5rem; 
      border-radius: 4px; 
      cursor: pointer; 
      text-decoration: none;
      display: inline-block;
      transition: background 0.3s;
    }
    .btn:hover { background: #2980b9; }
    .btn.secondary { background: #95a5a6; }
    .btn.secondary:hover { background: #7f8c8d; }
    .status { 
      padding: 1rem; 
      background: #ecf0f1; 
      border-radius: 4px; 
      margin-bottom: 2rem;
    }
    .status.online { background: #d5e8d4; border-left: 4px solid #27ae60; }
    .quick-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }
    @media (max-width: 768px) {
      .container { padding: 0 1rem; }
      .dashboard-grid { grid-template-columns: 1fr; }
      .header { padding: 1rem; }
      .quick-actions { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏛️ Farewell/Howdy Admin Dashboard</h1>
    <button class="logout-btn" onclick="logout()">Logout</button>
  </div>

  <div class="container">
    <div class="status online">
      <strong>System Status:</strong> All services operational ✅
    </div>

    <div class="quick-actions">
      <button class="btn" onclick="refreshData()">🔄 Refresh Data</button>
      <button class="btn secondary" onclick="viewLogs()">📋 View Logs</button>
      <button class="btn secondary" onclick="exportData()">📥 Export Data</button>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <h3>📅 Events Management</h3>
        <p>Manage upcoming events, flyers, and venue scheduling for both Farewell and Howdy.</p>
        <button class="btn" onclick="navigateTo('/events')">Manage Events</button>
      </div>

      <div class="card">
        <h3>🖼️ Gallery & Flyers</h3>
        <p>Upload and organize event flyers, photos, and gallery content.</p>
        <button class="btn" onclick="navigateTo('/gallery')">Manage Gallery</button>
      </div>

      <div class="card">
        <h3>📝 Blog & Newsletter</h3>
        <p>Create blog posts, manage newsletter content, and featured information.</p>
        <button class="btn" onclick="navigateTo('/blog')">Manage Blog</button>
      </div>

      <div class="card">
        <h3>🍽️ Menu Management</h3>
        <p>Update food and drink menus for both venues, including pricing and availability.</p>
        <button class="btn" onclick="navigateTo('/menu')">Manage Menu</button>
      </div>

      <div class="card">
        <h3>🕒 Operating Hours</h3>
        <p>Set business hours, special holiday hours, and venue-specific schedules.</p>
        <button class="btn" onclick="navigateTo('/hours')">Manage Hours</button>
      </div>

      <div class="card">
        <h3>🔄 Data Migration</h3>
        <p>Tools for migrating data from legacy systems and managing database operations.</p>
        <button class="btn secondary" onclick="navigateTo('/migration')">Migration Tools</button>
      </div>
    </div>
  </div>

  <script>
    // Check authentication on load
    window.addEventListener('load', async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        if (!response.ok) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        window.location.href = '/login';
      }
    });

    function logout() {
      const token = localStorage.getItem('authToken');
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
      }
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    function navigateTo(path) {
      // TODO: Implement SPA navigation or redirect to specific admin pages
      alert(\`Navigation to \${path} not yet implemented\`);
    }

    function refreshData() {
      window.location.reload();
    }

    function viewLogs() {
      alert('Logs viewer not yet implemented');
    }

    function exportData() {
      alert('Data export not yet implemented');
    }
  </script>
</body>
</html>`;
}
