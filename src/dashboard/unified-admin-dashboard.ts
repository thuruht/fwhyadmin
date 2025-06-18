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
    }
    /* ...existing CSS from both dashboards merged... */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Farewell/Howdy Admin</h1>
      <div class="user-info">
        <span>Welcome, Admin</span>
        <button class="btn btn-secondary" onclick="logout()">Logout</button>
      </div>
    </div>
    <div class="quick-stats" id="quick-stats"></div>
    <div class="dashboard-grid">
      <div class="section" id="quick-actions"></div>
      <div class="section" id="event-management"></div>
    </div>
    <div class="section" id="tabs-section"></div>
  </div>
  <div id="modals"></div>
  <script>
    // Unified Admin Dashboard JS Logic
    const API_BASE = '/api';
    // Logout function: clear session/localStorage and reload
    function logout() {
      // Clear any tokens or session info (customize as needed)
      localStorage.clear();
      sessionStorage.clear();n      document.cookie = '';
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

    // Initial load
    loadStats();
    loadEvents();
    loadBlog();
  </script>
  <script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>
</body>
</html>`;
}
