// src/dashboard/unified-admin-dashboard.ts
// Unified Admin Dashboard: Merges best of admin-dashboard.html and admin-dashboard.ts

export function generateUnifiedDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Farewell/Howdy Admin Dashboard</title>
  <link rel="stylesheet" href="/css/ccssss.css">
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
  <style>
    :root {
      --primary-color: #2563eb;
      --secondary-color: #64748b;
      --success-color: #059669;
      --error-color: #dc2626;
      --warning-color: #d97706;
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --border-color: #e2e8f0;
      --farewell-color: #e03e00;
      --howdy-color: #2563eb;
    }
    body {
      background: var(--bg-color);
      font-family: 'Inter', Arial, sans-serif;
      margin: 0;
      min-height: 100vh;
      color: var(--text-primary);
    }
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 220px;
      background: linear-gradient(180deg, var(--farewell-color) 0%, var(--howdy-color) 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem 1rem 1rem;
      box-shadow: 2px 0 10px #0002;
    }
    .sidebar h1 {
      font-family: var(--font-hnm11, 'Inter');
      font-size: 2rem;
      margin-bottom: 2rem;
      letter-spacing: 2px;
      text-align: center;
    }
    .sidebar nav {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .sidebar nav button {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.1rem;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
      text-align: left;
    }
    .sidebar nav button.active, .sidebar nav button:hover {
      background: #fff2;
    }
    .sidebar .logout-btn {
      margin-top: auto;
      background: var(--error-color);
      color: #fff;
      width: 100%;
      font-weight: bold;
    }
    .main-content {
      flex: 1;
      padding: 2rem 3vw;
      background: var(--bg-color);
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .card {
      background: var(--card-bg);
      border-radius: 10px;
      box-shadow: 0 2px 12px #0001;
      padding: 2rem;
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--primary-color);
      font-family: var(--font-hnm11, 'Inter');
    }
    @media (max-width: 900px) {
      .dashboard-layout { flex-direction: column; }
      .sidebar { width: 100%; flex-direction: row; justify-content: space-between; padding: 1rem; }
      .sidebar nav { flex-direction: row; gap: 0.5rem; }
      .main-content { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="dashboard-layout">
    <aside class="sidebar">
      <h1>Farewell<br>& Howdy<br>Admin</h1>
      <nav>
        <button id="nav-stats" class="active">Quick Stats</button>
        <button id="nav-events">Events</button>
        <button id="nav-blog">Blog</button>
      </nav>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </aside>
    <main class="main-content">
      <section id="section-stats" class="card">
        <div class="section-title">Quick Stats</div>
        <div id="quick-stats"></div>
      </section>
      <section id="section-events" class="card" style="display:none;">
        <div class="section-title">Event Management</div>
        <div id="event-management"></div>
      </section>
      <section id="section-blog" class="card" style="display:none;">
        <div class="section-title">Blog Management</div>
        <div id="tabs-section"></div>
      </section>
    </main>
  </div>
  <div id="modals"></div>
  <script>
    // Unified Admin Dashboard JS Logic
    const API_BASE = '/api';
    // Logout function: clear session/localStorage and reload
    function logout() {
      // Clear any tokens or session info (customize as needed)
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = '';
      window.location.reload();
    }
    // Utility: Fetch wrapper
    async function apiFetch(url, options = {}) {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API error');
      return data.data;
    }

    // Quick Stats
    async function loadStats() {
      try {
        const events = await apiFetch(\`\${API_BASE}/events/list\`);
        const blog = await apiFetch(\`\${API_BASE}/blog/posts\`);
        document.getElementById('quick-stats').innerHTML = \`
          <div><b>Events:</b> \${events.total}</div>
          <div><b>Blog Posts:</b> \${blog.length}</div>
        \`;
      } catch (e) {
        document.getElementById('quick-stats').innerHTML = \`<span style='color:red'>Stats error: \${e.message}</span>\`;
      }
    }

    // Event Management CRUD
    async function loadEvents() {
      try {
        const { events } = await apiFetch(\`\${API_BASE}/events/list\`);
        let html = \`<button onclick="showEventForm()">+ Add Event</button><ul>\`;
        for (const ev of events) {
          html += \`<li><b>\${ev.title}</b> (\${ev.venue}, \${ev.date})
            <button onclick="editEvent('\${ev.id}')">Edit</button>
            <button onclick="deleteEvent('\${ev.id}')">Delete</button></li>\`;
        }
        html += '</ul>';
        document.getElementById('event-management').innerHTML = html;
      } catch (e) {
        document.getElementById('event-management').innerHTML = \`<span style='color:red'>Events error: \${e.message}</span>\`;
      }
    }
    function showEventForm(ev = null) {
      const isEdit = !!ev;
      const form = document.createElement('form');
      form.innerHTML = \`
        <h3>\${isEdit ? 'Edit' : 'Add'} Event</h3>
        <input name='title' placeholder='Title' value='\${ev?.title || ''}' required><br>
        <input name='date' type='date' value='\${ev?.date || ''}' required><br>
        <input name='time' type='time' value='\${ev?.time || ''}'><br>
        <input name='venue' placeholder='Venue' value='\${ev?.venue || ''}' required><br>
        <input name='suggestedPrice' placeholder='Suggested Price' value='\${ev?.suggested_price || ''}'><br>
        <input name='ticketLink' placeholder='Ticket Link' value='\${ev?.ticket_url || ''}'><br>
        <input name='ageRestriction' placeholder='Age Restriction' value='\${ev?.age_restriction || ''}'><br>
        <textarea name='description' placeholder='Description'>\${ev?.description || ''}</textarea><br>
        <input name='flyer' type='file' accept='image/*'><br>
        <button type='submit'>\${isEdit ? 'Update' : 'Create'}</button>
        <button type='button' onclick='loadEvents()'>Cancel</button>
      \`;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        let url = \`\${API_BASE}/events\`;
        let method = isEdit ? 'PUT' : 'POST';
        if (isEdit) url += \`/\${ev.id}\`;
        try {
          await fetch(url, { method, body: fd });
          loadEvents();
        } catch (err) { alert('Error: ' + err.message); }
      };
      document.getElementById('event-management').innerHTML = '';
      document.getElementById('event-management').appendChild(form);
    }
    async function editEvent(id) {
      const { events } = await apiFetch(\`\${API_BASE}/events/list\`);
      const ev = events.find(e => e.id === id);
      showEventForm(ev);
    }
    async function deleteEvent(id) {
      if (!confirm('Delete this event?')) return;
      await fetch(\`\${API_BASE}/events/\${id}\`, { method: 'DELETE' });
      loadEvents();
    }

    // Blog Management CRUD with Quill and custom image upload
    let quill;
    function initQuillBlogEditor(container, initialContent = '') {
      if (!container) return;
      quill = new Quill(container, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }
      });
      quill.root.innerHTML = initialContent;
      // Custom image handler
      quill.getModule('toolbar').addHandler('image', function() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = async () => {
          const file = input.files[0];
          if (file) {
            // Upload image to backend
            const formData = new FormData();
            formData.append('image', file);
            try {
              const res = await fetch(\`\${API_BASE}/blog/posts/upload-image\`, { method: 'POST', body: formData });
              const data = await res.json();
              if (data.success && data.url) {
                const range = quill.getSelection();
                quill.insertEmbed(range.index, 'image', data.url);
              } else {
                alert('Image upload failed');
              }
            } catch (e) {
              alert('Image upload error: ' + e.message);
            }
          }
        };
      });
    }
    async function loadBlog() {
      try {
        const posts = await apiFetch(\`\${API_BASE}/blog/posts\`);
        let html = \`<button onclick="showBlogForm()">+ Add Post</button><ul>\`;
        for (const post of posts) {
          html += \`<li><b>\${post.title}</b> (\${post.date})
            <button onclick="editBlog('\${post.id}')">Edit</button>
            <button onclick="deleteBlog('\${post.id}')">Delete</button></li>\`;
        }
        html += '</ul>';
        document.getElementById('tabs-section').innerHTML = html;
      } catch (e) {
        document.getElementById('tabs-section').innerHTML = \`<span style='color:red'>Blog error: \${e.message}</span>\`;
      }
    }
    function showBlogForm(post = null) {
      const isEdit = !!post;
      const form = document.createElement('form');
      form.innerHTML = \`
        <h3>\${isEdit ? 'Edit' : 'Add'} Blog Post</h3>
        <input name='title' placeholder='Title' value='\${post?.title || ''}' required><br>
        <input name='date' type='date' value='\${post?.date || ''}' required><br>
        <div id='quill-editor-container'></div><br>
        <button type='submit'>\${isEdit ? 'Update' : 'Create'}</button>
        <button type='button' onclick='loadBlog()'>Cancel</button>
      \`;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const title = form.querySelector('[name="title"]').value;
        const date = form.querySelector('[name="date"]').value;
        const content = quill.root.innerHTML;
        let url = \`\${API_BASE}/blog/posts\`;
        let method = isEdit ? 'PUT' : 'POST';
        if (isEdit) url += \`/\${post.id}\`;
        try {
          await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, date, content })
          });
          loadBlog();
        } catch (err) { alert('Error: ' + err.message); }
      };
      document.getElementById('tabs-section').innerHTML = '';
      document.getElementById('tabs-section').appendChild(form);
      // Initialize Quill after form is in DOM
      setTimeout(() => initQuillBlogEditor(form.querySelector('#quill-editor-container'), post?.content || ''), 0);
    }
    async function editBlog(id) {
      const posts = await apiFetch(\`\${API_BASE}/blog/posts\`);
      const post = posts.find(p => p.id === id);
      showBlogForm(post);
    }
    async function deleteBlog(id) {
      if (!confirm('Delete this post?')) return;
      await fetch(\`\${API_BASE}/blog/posts/\${id}\`, { method: 'DELETE' });
      loadBlog();
    }

    // Navigation logic
    document.getElementById('nav-stats').onclick = function() {
      setActiveSection('stats');
    };
    document.getElementById('nav-events').onclick = function() {
      setActiveSection('events');
    };
    document.getElementById('nav-blog').onclick = function() {
      setActiveSection('blog');
    };
    function setActiveSection(section) {
      document.getElementById('section-stats').style.display = section === 'stats' ? '' : 'none';
      document.getElementById('section-events').style.display = section === 'events' ? '' : 'none';
      document.getElementById('section-blog').style.display = section === 'blog' ? '' : 'none';
      document.getElementById('nav-stats').classList.toggle('active', section === 'stats');
      document.getElementById('nav-events').classList.toggle('active', section === 'events');
      document.getElementById('nav-blog').classList.toggle('active', section === 'blog');
    }

    // Initial load
    loadStats();
    loadEvents();
    loadBlog();
  </script>
  <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
</body>
</html>`;
}
