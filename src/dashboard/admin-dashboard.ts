// src/dashboard/admin-dashboard.ts

export function generateDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - Farewell/Howdy</title>
  <link rel="stylesheet" href="./css/ccssss.css">
  <style>
    /* Admin-specific overrides using the 404 page style */
    body { 
      background: var(--header-bg);
      color: var(--text-color);
      font-family: var(--font-main);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      margin: 0 auto;
      text-align: center;
    }
    
    .admin-header { 
      width: 100%;
      background: var(--primary-bg-color) url('/img/bg4.png') center/cover no-repeat;
      background-attachment: fixed; /* This prevents multiple loads on scrolling */
      border-bottom: 1px solid var(--nav-border-color);
      padding: 1rem 2rem; 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: 212px;
    }
    
    .admin-header h1 { 
      font-family: var(--font-db);
      font-size: clamp(3.5rem, 11.3vw, 6em);
      color: var(--secondary-bg-color);
      -webkit-text-stroke: 1px black;
      text-shadow: -1px -1px 0 #000,
           1px -1px 0 #000,
          -1px  1px 0 #000,
           1px  1px 0 #000,
          -13px 13px 0px var(--nav-border-color);
    }
    
    .logout-btn { 
      display: inline-block;
      padding: 1rem 2rem;
      background: var(--button-bg-color);
      color: var(--button-text-color);
      text-decoration: none;
      font-family: var(--font-main);
      font-weight: bold;
      border-radius: 4px;
      transition: all var(--transition-speed) ease;
      border: 2px solid var(--text-color);
      cursor: pointer;
    }
    
    .logout-btn:hover { 
      background: var(--accent-color);
      color: white;
      transform: translateY(-2px);
    }
    
    .admin-container { 
      max-width: 1400px; 
      margin: 2rem auto; 
      padding: 0 2rem; 
      width: 100%;
    }
    
    .admin-tabs {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--nav-border-color);
      width: 100%;
    }
    
    .admin-tab {
      background: transparent;
      border: none;
      color: var(--text-color);
      padding: 1rem 2rem;
      cursor: pointer;
      font-family: var(--font-main);
      font-size: 1.1rem;
      font-weight: bold;
      transition: all var(--transition-speed) ease;
      border-bottom: 2px solid transparent;
      margin: 0 0.5rem;
    }
    
    .admin-tab:hover {
      color: var(--redd);
      border-bottom-color: var(--redd);
    }
    
    .admin-tab.active {
      color: var(--pupil);
      border-bottom-color: var(--pupil);
      background-color: rgba(0, 0, 0, 0.2);
    }
    .admin-panel {
      display: none;
      animation: fadeIn 0.5s ease;
    }
    .admin-panel.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .admin-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
      gap: 2rem; 
      margin-bottom: 2rem;
      width: 100%;
    }
    
    .card {
      background: var(--card-bg-color, #1a1a1a); 
      border: 2px solid var(--nav-border-color, #333);
      border-radius: 6px; 
      padding: 2rem; 
      box-shadow: -5px 5px 0px rgba(0, 0, 0, 0.2);
      transition: all var(--transition-speed, 0.3s) ease;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      min-height: 350px;
    }
    
    .card:hover {
      transform: translateY(-5px);
      box-shadow: -8px 8px 0px rgba(0, 0, 0, 0.3);
    }
    
    .card h2 {
      font-family: var(--font-db, 'hnm11');
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: var(--pupil, #e60000);
      text-transform: uppercase;
      -webkit-text-stroke: 1px #000000;
      text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
    }
    
    .card p {
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
      line-height: 1.5;
    }
    
    .card img {
      margin: 1rem 0;
      max-width: 100px;
      height: auto;
    }
    }
    .admin-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(255, 107, 107, 0.1);
      border-color: rgba(255, 107, 107, 0.4);
    }
    .admin-card h3 { 
      color: var(--accent-color, #ff6b6b); 
      margin-bottom: 1rem;
      font-size: 1.4rem;
      text-shadow: 0 0 5px rgba(255, 107, 107, 0.3);
    }
    .admin-btn { 
      background: linear-gradient(135deg, #3498db, #2980b9); 
      color: white; 
      border: none; 
      padding: 0.8rem 1.5rem; 
      border-radius: 6px; 
      cursor: pointer; 
      margin: 0.5rem 0.5rem 0.5rem 0; 
      font-family: var(--font-main, 'kb', monospace);
      transition: all 0.3s ease;
      box-shadow: 0 2px 10px rgba(52, 152, 219, 0.3);
    }
    .admin-btn:hover { 
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(52, 152, 219, 0.5);
    }
    .admin-btn.danger { 
      background: linear-gradient(135deg, #e74c3c, #c0392b); 
      box-shadow: 0 2px 10px rgba(231, 76, 60, 0.3);
    }
    .admin-btn.danger:hover { 
      box-shadow: 0 4px 20px rgba(231, 76, 60, 0.5);
    }
    .admin-btn.success { 
      background: linear-gradient(135deg, #27ae60, #229954); 
      box-shadow: 0 2px 10px rgba(39, 174, 96, 0.3);
    }
    .admin-btn.success:hover { 
      box-shadow: 0 4px 20px rgba(39, 174, 96, 0.5);
    }
    .status { 
      display: inline-block; 
      padding: 0.3rem 0.8rem; 
      border-radius: 20px; 
      font-size: 0.8rem; 
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status.operational { 
      background: rgba(39, 174, 96, 0.2); 
      color: var(--success-color, #27ae60); 
      border: 1px solid rgba(39, 174, 96, 0.3);
    }
    .status.maintenance { 
      background: rgba(241, 196, 15, 0.2); 
      color: var(--warning-color, #f1c40f); 
      border: 1px solid rgba(241, 196, 15, 0.3);
    }
    .status.error { 
      background: rgba(231, 76, 60, 0.2); 
      color: var(--error-color, #e74c3c); 
      border: 1px solid rgba(231, 76, 60, 0.3);
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--accent-color, #ff6b6b);
      font-weight: bold;
    }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%;
      padding: 0.8rem;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid var(--nav-border-color);
      border-radius: 4px;
      color: var(--text-color);
      font-family: var(--font-hnm11);
      font-size: 1rem;
    }
    
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      outline: none;
      border-color: var(--secondary-bg-color);
      box-shadow: -3px 3px 0px rgba(0, 0, 0, 0.2);
    }
    .event-item, .blog-item {
      background: var(--card-bg-color);
      border: 1px solid var(--nav-border-color);
      border-radius: 4px;
      padding: 1rem;
      margin-bottom: 1rem;
      transition: all var(--transition-speed) ease;
      box-shadow: -3px 3px 0px rgba(0, 0, 0, 0.2);
      text-align: left;
    }
    
    .event-item:hover, .blog-item:hover {
      border-color: var(--accent-color);
      transform: translateY(-2px);
      box-shadow: -5px 5px 0px rgba(0, 0, 0, 0.3);
    }
    .venue-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: bold;
      text-transform: uppercase;
      margin-right: 0.5rem;
    }
    .venue-badge.farewell {
      background: rgba(231, 76, 60, 0.2);
      color: var(--farewell-color, #e74c3c);
      border: 1px solid rgba(231, 76, 60, 0.3);
    }
    .venue-badge.howdy {
      background: rgba(52, 152, 219, 0.2);
      color: var(--howdy-color, #3498db);
      border: 1px solid rgba(52, 152, 219, 0.3);
    }
    .venue-badge.both {
      background: rgba(155, 89, 182, 0.2);
      color: var(--both-venues-color, #9b59b6);
      border: 1px solid rgba(155, 89, 182, 0.3);
    }
    
    
    .loading, .empty-message, .error-message {
      text-align: center;
      padding: 2rem;
      font-size: 1.2rem;
      color: var(--text-color);
      font-family: var(--font-main);
    }
    
    .empty-message {
      color: var(--pupil);
    }
    
    .error-message {
      color: var(--redd);
    }
    
    .event-item, .blog-item, .gallery-item {
      background: var(--card-bg-color);
      border: 1px solid var(--nav-border-color);
      border-radius: 4px;
      padding: 1rem;
      margin-bottom: 1rem;
      transition: all var(--transition-speed) ease;
      box-shadow: -3px 3px 0px rgba(0, 0, 0, 0.2);
      text-align: left;
    }
    
    .event-item:hover, .blog-item:hover, .gallery-item:hover {
      border-color: var(--accent-color);
      transform: translateY(-2px);
      box-shadow: -5px 5px 0px rgba(0, 0, 0, 0.3);
    }
    
    .home-link {
      background: var(--button-bg-color);
      color: var(--button-text-color);
      border: 1px solid var(--nav-border-color);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      text-decoration: none;
      font-family: var(--font-main);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all var(--transition-speed) ease;
      display: inline-block;
      margin: 0.25rem;
    }
    
    .home-link:hover {
      background: var(--accent-color);
      color: white;
      transform: translateY(-1px);
    }
    
    .venue-selector {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      justify-content: center;
    }
    
    .venue-button.active {
      background: var(--secondary-bg-color);
      color: white;
    }
    
    /* Notification system to replace alerts */
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 5px;
      color: white;
      font-family: var(--font-main);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      animation: slideIn 0.3s ease, fadeOut 0.5s ease 2.5s forwards;
      cursor: pointer;
    }
    
    .notification.success {
      background: linear-gradient(135deg, #28a745, #218838);
      border-left: 5px solid #1e7e34;
    }
    
    .notification.error {
      background: linear-gradient(135deg, #dc3545, #c82333);
      border-left: 5px solid #bd2130;
    }
    
    .notification.info {
      background: linear-gradient(135deg, #17a2b8, #138496);
      border-left: 5px solid #117a8b;
    }
    
    .notification.warning {
      background: linear-gradient(135deg, #ffc107, #e0a800);
      border-left: 5px solid #d39e00;
      color: #333;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; visibility: hidden; }
    }
  </style>
</head>
<body>
  <div class="admin-header">
    <h1>administration!</h1>
    <button class="logout-btn" onclick="logout()">logout</button>
  </div>
  <div class="admin-container">
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="showPanel('events')">EVENTS</button>
      <button class="admin-tab" onclick="showPanel('gallery')">GALLERY</button>
      <button class="admin-tab" onclick="showPanel('blog')">BLOG</button>
    </div>
    <div id="admin-content-area">
      <!-- Content panels will be loaded here -->
    </div>
  </div>
  <script>
    // Notification System
    function showNotification(message, type = 'info') {
      // Remove any existing notifications
      const existingNotification = document.querySelector('.notification');
      if (existingNotification) {
        existingNotification.remove();
      }
      
      // Create new notification
      const notification = document.createElement('div');
      notification.className = \`notification \${type}\`;
      notification.innerText = message;
      
      // Add to document
      document.body.appendChild(notification);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);
      
      // Click to dismiss early
      notification.addEventListener('click', () => {
        notification.remove();
      });
    }
    
    // Show correct panel and load content
    function showPanel(panel) {
      // Load the appropriate manager into the content area
      if(panel === 'events') loadEventsManager();
      if(panel === 'gallery') loadGalleryManager();
      if(panel === 'blog') loadBlogManager();
      
      // Update tab appearance
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      const tabs = document.querySelectorAll('.admin-tab');
      if(panel === 'events') tabs[0].classList.add('active');
      if(panel === 'gallery') tabs[1].classList.add('active');
      if(panel === 'blog') tabs[2].classList.add('active');
    }

    // Check authentication on load
    window.addEventListener('load', async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      // Auth check
      try {
        const response = await fetch('/api/auth/verify', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        if (!response.ok) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
      } catch (error) {
        window.location.href = '/login';
      }
      
      // Load events manager by default
      loadEventsManager();
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
      // Implement actual navigation to admin sections
      switch(path) {
        case '/blog':
          // Load blog management interface
          loadBlogManager();
          break;
        case '/events':
          // Load events management interface
          loadEventsManager();
          break;
        case '/gallery':
          // Load gallery management interface
          loadGalleryManager();
          break;
        default:
          showNotification(\`Navigation to \${path} not yet implemented\`, 'warning');
      }
    }

    // Show correct panel and load content
    function showPanel(panel) {
      // Load the appropriate manager into the content area
      if(panel === 'events') loadEventsManager();
      if(panel === 'gallery') loadGalleryManager();
      if(panel === 'blog') loadBlogManager();
      
      // Update tab appearance
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      const tabs = document.querySelectorAll('.admin-tab');
      if(panel === 'events') tabs[0].classList.add('active');
      if(panel === 'gallery') tabs[1].classList.add('active');
      if(panel === 'blog') tabs[2].classList.add('active');
    }
    
    // Load and display the events management interface
    async function loadEventsManager() {
      const contentArea = document.getElementById('admin-content-area');
      if (!contentArea) {
        console.error('Admin content area not found');
        return;
      }
      
      contentArea.innerHTML = \`
          <h2>EVENTS MANAGEMENT</h2>
          <div class="venue-selector">
            <button class="home-link venue-button active" data-venue="farewell">FAREWELL EVENTS</button>
            <button class="home-link venue-button" data-venue="howdy">HOWDY EVENTS</button>
            <button class="home-link venue-button" data-venue="other">OTHER EVENTS</button>
          </div>
          
          <div class="event-controls">
            <div class="control-group">
              <button class="home-link" id="create-event-btn">CREATE NEW EVENT</button>
              <button class="home-link" id="upload-flyer-btn">UPLOAD FLYER</button>
            </div>
            <div class="control-group">
              <label for="events-sort">Sort by:</label>
              <select id="events-sort" class="event-sort">
                <option value="date-asc">Date (Soonest First)</option>
                <option value="date-desc">Date (Latest First)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
          
          <div id="events-container">
            <div class="loading">Loading events...</div>
          </div>
          
          <!-- Event Creation Form -->
          <div id="event-form-container" style="display: none;">
            <h3>CREATE/EDIT EVENT</h3>
            <form id="event-form">
              <input type="hidden" id="event-id" name="id">
              
              <div class="form-group">
                <label for="event-title">Event Title</label>
                <input type="text" id="event-title" name="title" required>
              </div>
              
              <div class="form-group">
                <label for="event-date">Event Date</label>
                <input type="date" id="event-date" name="date" required>
              </div>
              
              <div class="form-group">
                <label for="event-time">Event Time</label>
                <input type="time" id="event-time" name="time" required>
              </div>
              
              <div class="form-group">
                <label for="event-venue">Venue</label>
                <select id="event-venue" name="venue" required>
                  <option value="farewell">Farewell</option>
                  <option value="howdy">Howdy</option>
                  <option value="other">Other/Both</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="event-description">Description</label>
                <textarea id="event-description" name="description" rows="5"></textarea>
              </div>
              
              <div class="form-group">
                <label for="event-price">Suggested Price</label>
                <input type="text" id="event-price" name="suggestedPrice">
              </div>
              
              <div class="form-group">
                <label for="event-ticket-link">Ticket Link</label>
                <input type="url" id="event-ticket-link" name="ticketLink">
              </div>
              
              <div class="form-group">
                <label for="event-age">Age Restriction</label>
                <select id="event-age" name="ageRestriction">
                  <option value="">No Restriction</option>
                  <option value="18+">18+</option>
                  <option value="21+">21+</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="event-flyer">Flyer Image</label>
                <input type="file" id="event-flyer" name="flyer" accept="image/*">
                <div id="current-flyer-preview"></div>
              </div>
              
              <div class="form-group">
                <label for="event-order">Slideshow Order (0 = auto)</label>
                <input type="number" id="event-order" name="order" min="0" value="0">
              </div>
              
              <div class="form-actions">
                <button type="submit" class="home-link">SAVE EVENT</button>
                <button type="button" class="home-link" id="cancel-event-btn">CANCEL</button>
              </div>
            </form>
          </div>
      \`;
      
      // Initialize event handlers
      const venueButtons = document.querySelectorAll('.venue-button');
      venueButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Update active button
          venueButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          // Load events for the selected venue
          const venue = button.getAttribute('data-venue');
          loadEventsForVenue(venue);
        });
      });
      
      // Initial load for default venue (farewell)
      loadEventsForVenue('farewell');
      
      // Setup event creation form
      document.getElementById('create-event-btn').addEventListener('click', () => {
        showEventForm();
      });
      
      document.getElementById('cancel-event-btn').addEventListener('click', () => {
        hideEventForm();
      });
      
      document.getElementById('upload-flyer-btn').addEventListener('click', () => {
        showFlyerUploadForm();
      });
      
      document.getElementById('event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEvent();
      });
    }
    
    // Load events for a specific venue
    async function loadEventsForVenue(venue) {
      const container = document.getElementById('events-container');
      container.innerHTML = '<div class="loading">Loading events...</div>';
      
      try {
        const response = await fetch(\`/api/events/list?venue=\${venue}\`);
        
        if (!response.ok) {
          throw new Error(\`Failed to fetch events: \${response.status}\`);
        }
        
        const data = await response.json();
        const events = data.events || [];
        
        if (events.length === 0) {
          container.innerHTML = '<div class="empty-message">No events found for this venue</div>';
          return;
        }
        
        let html = '';
        events.forEach(event => {
          const dateFormatted = new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          });
          
          html += \`
            <div class="event-item" data-id="\${event.id}">
              <div class="event-item-content">
                <div class="event-image">
                  <img src="\${event.thumbnail_url || event.flyer_url || '/img/placeholder.png'}" 
                       alt="\${event.title}" 
                       onerror="this.src='/img/placeholder.png'">
                </div>
                <div class="event-details">
                  <h3>\${event.title}</h3>
                  <div class="event-meta">
                    <span class="event-date">\${dateFormatted}</span>
                    <span class="event-time">\${event.time || 'TBA'}</span>
                    <span class="venue-badge \${event.venue}">\${event.venue_display || event.venue}</span>
                  </div>
                  <p class="event-description">\${event.description || ''}</p>
                  <div class="event-actions">
                    <button class="edit-event-btn home-link" data-id="\${event.id}">EDIT</button>
                    <button class="delete-event-btn home-link" data-id="\${event.id}">DELETE</button>
                  </div>
                </div>
              </div>
            </div>
          \`;
        });
        
        container.innerHTML = html;
        
        // Add event handlers for edit/delete buttons
        document.querySelectorAll('.edit-event-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const eventId = btn.getAttribute('data-id');
            editEvent(eventId);
          });
        });
        
        document.querySelectorAll('.delete-event-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const eventId = btn.getAttribute('data-id');
            deleteEvent(eventId);
          });
        });
        
      } catch (error) {
        console.error('Error loading events:', error);
        container.innerHTML = '<div class="error-message">Error loading events: ' + error.message + '</div>';
      }
    }
    
    // Show the event creation/edit form
    async function showEventForm(eventId = null) {
      const formContainer = document.getElementById('event-form-container');
      const form = document.getElementById('event-form');
      
      // Reset form
      form.reset();
      document.getElementById('event-id').value = '';
      document.getElementById('current-flyer-preview').innerHTML = '';
      
      // If editing an existing event, populate the form
      if (eventId) {
        try {
          const response = await fetch(\`/api/events/\${eventId}\`);
          
          if (!response.ok) {
            throw new Error(\`Failed to fetch event: \${response.status}\`);
          }
          
          const event = await response.json();
          
          // Populate form fields
          document.getElementById('event-id').value = event.id;
          document.getElementById('event-title').value = event.title || '';
          document.getElementById('event-date').value = event.date || '';
          document.getElementById('event-time').value = event.time || '';
          document.getElementById('event-venue').value = event.venue || 'farewell';
          document.getElementById('event-description').value = event.description || '';
          document.getElementById('event-price').value = event.suggested_price || event.suggestedPrice || '';
          document.getElementById('event-ticket-link').value = event.ticket_url || event.ticketLink || '';
          document.getElementById('event-age').value = event.age_restriction || '';
          document.getElementById('event-order').value = event.order || 0;
          
          // Show current flyer if available
          if (event.flyer_url || event.thumbnail_url) {
            const preview = document.getElementById('current-flyer-preview');
            preview.innerHTML = \`
              <img src="\${event.flyer_url || event.thumbnail_url}" alt="Current flyer" style="max-width: 200px; margin-top: 10px;">
              <p>Current flyer (upload new to replace)</p>
            \`;
          }
        } catch (error) {
          console.error('Error loading event for editing:', error);
          showNotification('Error loading event: ' + error.message, 'error');
          return;
        }
      }
      
      // Show form
      formContainer.style.display = 'block';
      document.getElementById('events-container').style.display = 'none';
      document.querySelector('.event-controls').style.display = 'none';
    }
    
    // Hide the event form
    function hideEventForm() {
      document.getElementById('event-form-container').style.display = 'none';
      document.getElementById('events-container').style.display = 'block';
      document.querySelector('.event-controls').style.display = 'flex';
    }
    
    // Save event (create or update)
    async function saveEvent() {
      const form = document.getElementById('event-form');
      const eventId = document.getElementById('event-id').value;
      const formData = new FormData(form);
      
      try {
        const url = eventId ? \`/api/events/\${eventId}\` : '/api/events';
        const method = eventId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(\`Failed to save event: \${response.status}\`);
        }
        
        // Reload events for the current venue
        const activeVenue = document.querySelector('.venue-button.active').getAttribute('data-venue');
        loadEventsForVenue(activeVenue);
        
        // Hide form
        hideEventForm();
        showNotification('Event saved successfully', 'success');
      } catch (error) {
        console.error('Error saving event:', error);
        showNotification('Error saving event: ' + error.message, 'error');
      }
    }
    
    // Delete an event
    async function deleteEvent(eventId) {
      if (!confirm('Are you sure you want to delete this event?')) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/events/\${eventId}\`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(\`Failed to delete event: \${response.status}\`);
        }
        
        // Reload events for the current venue
        const activeVenue = document.querySelector('.venue-button.active').getAttribute('data-venue');
        loadEventsForVenue(activeVenue);
        showNotification('Event deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting event:', error);
        showNotification('Error deleting event: ' + error.message, 'error');
      }
    }
    
    // Show flyer upload form
    function showFlyerUploadForm() {
      const container = document.querySelector('.admin-container');
      const currentContent = container.innerHTML;
      
      container.innerHTML = 
        '<h2>UPLOAD EVENT FLYER</h2>' +
        '<div class="flyer-upload-form">' +
          '<form id="flyer-upload-form">' +
            '<div class="form-group">' +
              '<label for="flyer-venue">Venue</label>' +
              '<select id="flyer-venue" name="venue" required>' +
                '<option value="farewell">Farewell</option>' +
                '<option value="howdy">Howdy</option>' +
                '<option value="other">Other/Both</option>' +
              '</select>' +
            '</div>' +
            
            '<div class="form-group">' +
              '<label for="flyer-image">Flyer Image</label>' +
              '<input type="file" id="flyer-image" name="flyer" accept="image/*" required>' +
            '</div>' +
            
            '<div class="form-group">' +
              '<label for="flyer-title">Title (Optional)</label>' +
              '<input type="text" id="flyer-title" name="title">' +
            '</div>' +
            
            '<div class="form-group">' +
              '<label for="flyer-order">Display Order (0 = auto)</label>' +
              '<input type="number" id="flyer-order" name="order" min="0" value="0">' +
            '</div>' +
            
            '<div class="form-actions">' +
              '<button type="submit" class="home-link">UPLOAD FLYER</button>' +
              '<button type="button" class="home-link" id="back-to-events">CANCEL</button>' +
            '</div>' +
          '</form>' +
        '</div>';
      
      document.getElementById('back-to-events').addEventListener('click', () => {
        // Restore previous content
        container.innerHTML = currentContent;
        
        // Re-attach event handlers
        const venueButtons = document.querySelectorAll('.venue-button');
        venueButtons.forEach(button => {
          button.addEventListener('click', () => {
            venueButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const venue = button.getAttribute('data-venue');
            loadEventsForVenue(venue);
          });
        });
        
        document.getElementById('create-event-btn').addEventListener('click', () => {
          showEventForm();
        });
        
        document.getElementById('upload-flyer-btn').addEventListener('click', () => {
          showFlyerUploadForm();
        });
      });
      
      document.getElementById('flyer-upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        try {
          const response = await fetch('/api/gallery/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(\`Failed to upload flyer: \${response.status}\`);
          }
          
          showNotification('Flyer uploaded successfully', 'success');
          
          // Go back to events
          document.getElementById('back-to-events').click();
        } catch (error) {
          console.error('Error uploading flyer:', error);
          showNotification('Error uploading flyer: ' + error.message, 'error');
        }
      });
    }
    
    // Gallery Manager
    async function loadGalleryManager() {
      const contentArea = document.getElementById('admin-content-area');
      if (!contentArea) {
        console.error('Admin content area not found');
        return;
      }
      
      contentArea.innerHTML = \`
          <h2>GALLERY MANAGEMENT</h2>
          
          <div class="venue-selector">
            <button class="home-link venue-button active" data-venue="farewell">FAREWELL GALLERY</button>
            <button class="home-link venue-button" data-venue="howdy">HOWDY GALLERY</button>
            <button class="home-link venue-button" data-venue="other">OTHER GALLERY</button>
          </div>
          
          <div class="gallery-controls">
            <button class="home-link" id="upload-image-btn">UPLOAD NEW IMAGE</button>
            <div class="control-group">
              <label for="gallery-sort">Sort by:</label>
              <select id="gallery-sort" class="gallery-sort">
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
          
          <div id="gallery-container">
            <div class="loading">Loading gallery images...</div>
          </div>
      \`;
      
      // Initialize gallery
      const venueButtons = document.querySelectorAll('.venue-button');
      venueButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Update active button
          venueButtons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          
          // Load gallery for the selected venue
          const venue = button.getAttribute('data-venue');
          loadGalleryForVenue(venue);
        });
      });
      
      // Initial load for default venue (farewell)
      loadGalleryForVenue('farewell');
      
      // Setup upload button
      document.getElementById('upload-image-btn').addEventListener('click', () => {
        showImageUploadForm();
      });
    }
    
    // Load gallery images for a specific venue
    async function loadGalleryForVenue(venue) {
      const container = document.getElementById('gallery-container');
      container.innerHTML = '<div class="loading">Loading gallery images...</div>';
      
      try {
        const response = await fetch(\`/api/gallery/list?venue=\${venue}\`);
        
        if (!response.ok) {
          throw new Error(\`Failed to fetch gallery: \${response.status}\`);
        }
        
        const data = await response.json();
        const images = data.images || [];
        
        if (images.length === 0) {
          container.innerHTML = '<div class="empty-message">No images found for this venue</div>';
          return;
        }
        
        let html = '<div class="gallery-grid">';
        images.forEach(image => {
          html += \`
            <div class="gallery-item" data-id="\${image.id}">
              <div class="gallery-image">
                <img src="\${image.url}" alt="\${image.title || 'Gallery image'}" 
                     onerror="this.src='/img/placeholder.png'">
              </div>
              <div class="gallery-details">
                <h4>\${image.title || 'Untitled'}</h4>
                <p>\${new Date(image.uploaded_at || image.uploadedAt).toLocaleDateString()}</p>
                <div class="gallery-actions">
                  <button class="edit-image-btn home-link" data-id="\${image.id}">EDIT</button>
                  <button class="delete-image-btn home-link" data-id="\${image.id}">DELETE</button>
                </div>
              </div>
            </div>
          \`;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
        // Add event handlers for edit/delete buttons
        document.querySelectorAll('.edit-image-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const imageId = btn.getAttribute('data-id');
            editImage(imageId);
          });
        });
        
        document.querySelectorAll('.delete-image-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const imageId = btn.getAttribute('data-id');
            deleteImage(imageId);
          });
        });
        
      } catch (error) {
        console.error('Error loading gallery:', error);
        container.innerHTML = '<div class="error-message">Error loading gallery: ' + error.message + '</div>';
      }
    }
    
    // Edit gallery image
    async function editImage(imageId) {
      try {
        const response = await fetch(\`/api/gallery/\${imageId}\`);
        
        if (!response.ok) {
          throw new Error(\`Failed to fetch image: \${response.status}\`);
        }
        
        const image = await response.json();
        
        const container = document.querySelector('.admin-container');
        const currentContent = container.innerHTML;
        
        container.innerHTML = \`
          <h2>EDIT GALLERY IMAGE</h2>
          <div class="image-edit-form">
            <form id="image-edit-form">
              <input type="hidden" id="image-id" name="id" value="\${image.id}">
              
              <div class="form-group">
                <label for="edit-image-venue">Venue</label>
                <select id="edit-image-venue" name="venue" required>
                  <option value="farewell" \${image.venue === 'farewell' ? 'selected' : ''}>Farewell</option>
                  <option value="howdy" \${image.venue === 'howdy' ? 'selected' : ''}>Howdy</option>
                  <option value="other" \${image.venue === 'other' ? 'selected' : ''}>Other/Both</option>
                </select>
              </div>
              
              <div class="form-group">
                <img src="\${image.url}" alt="\${image.title || 'Gallery image'}" style="max-width: 300px; margin-bottom: 15px;">
                <label for="edit-image-file">Replace Image (Optional)</label>
                <input type="file" id="edit-image-file" name="image" accept="image/*">
              </div>
              
              <div class="form-group">
                <label for="edit-image-title">Title</label>
                <input type="text" id="edit-image-title" name="title" value="\${image.title || ''}">
              </div>
              
              <div class="form-group">
                <label for="edit-image-description">Description</label>
                <textarea id="edit-image-description" name="description">\${image.description || ''}</textarea>
              </div>
              
              <div class="form-actions">
                <button type="submit" class="home-link">SAVE CHANGES</button>
                <button type="button" class="home-link" id="back-to-gallery-from-edit">CANCEL</button>
              </div>
            </form>
          </div>
        \`;
        
        document.getElementById('back-to-gallery-from-edit').addEventListener('click', () => {
          // Restore previous gallery view
          container.innerHTML = currentContent;
          
          // Re-attach event handlers
          const venueButtons = document.querySelectorAll('.venue-button');
          venueButtons.forEach(button => {
            button.addEventListener('click', () => {
              venueButtons.forEach(btn => btn.classList.remove('active'));
              button.classList.add('active');
              
              const venue = button.getAttribute('data-venue');
              loadGalleryForVenue(venue);
            });
          });
          
          document.getElementById('upload-image-btn').addEventListener('click', () => {
            showImageUploadForm();
          });
        });
        
        document.getElementById('image-edit-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = new FormData(e.target);
          
          try {
            const response = await fetch(\`/api/gallery/\${imageId}\`, {
              method: 'PUT',
              body: formData
            });
            
            if (!response.ok) {
              throw new Error(\`Failed to update image: \${response.status}\`);
            }
            
            showNotification('Image updated successfully', 'success');
            
            // Go back to gallery
            document.getElementById('back-to-gallery-from-edit').click();
          } catch (error) {
            console.error('Error updating image:', error);
            showNotification('Error updating image: ' + error.message, 'error');
          }
        });
      } catch (error) {
        console.error('Error loading image for editing:', error);
        showNotification('Error loading image: ' + error.message, 'error');
      }
    }
    
    // Delete gallery image
    async function deleteImage(imageId) {
      if (!confirm('Are you sure you want to delete this image?')) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/gallery/\${imageId}\`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(\`Failed to delete image: \${response.status}\`);
        }
        
        showNotification('Image deleted successfully', 'success');
        
        // Reload gallery for the current venue
        const activeVenue = document.querySelector('.venue-button.active').getAttribute('data-venue');
        loadGalleryForVenue(activeVenue);
      } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('Error deleting image: ' + error.message, 'error');
      }
    }
    
    // Blog Manager
    async function loadBlogManager() {
      const contentArea = document.getElementById('admin-content-area');
      if (!contentArea) {
        console.error('Admin content area not found');
        return;
      }
      contentArea.innerHTML = \`
          <h2>BLOG MANAGEMENT</h2>
          <div class="blog-controls">
            <button class="home-link" id="create-blog-btn">CREATE NEW POST</button>
          </div>
          <div id="blog-container">
            <div class="loading">Loading blog posts...</div>
          </div>
          <div id="blog-form-container" style="display: none;"></div>
      \`;
      loadAllBlogPosts();
      document.getElementById('create-blog-btn').addEventListener('click', () => {
        showBlogForm();
      });
    }
    
    // Load all blog posts
    async function loadAllBlogPosts() {
      const container = document.getElementById('blog-container');
      container.innerHTML = '<div class="loading">Loading blog posts...</div>';
      try {
        const response = await fetch('/api/blog/admin/posts');
        if (!response.ok) throw new Error(\`Failed to fetch posts: \${response.status}\`);
        const data = await response.json();
        const posts = data.data || [];
        if (posts.length === 0) {
          container.innerHTML = '<div class="empty-message">No blog posts found</div>';
          return;
        }
        let html = '<div class="posts-list">';
        posts.forEach(post => {
          html += \`
            <div class="post-item" data-id="\${post.id}">
              <h4>\${post.title}</h4>
              <p>\${post.content.substring(0, 100)}...</p>
              <small>ID: \${post.id} | Created: \${new Date(post.created_at).toLocaleDateString()}</small>
              <div class="post-actions">
                <button class="edit-post-btn" data-id="\${post.id}">Edit</button>
                <button class="delete-post-btn" data-id="\${post.id}">Delete</button>
              </div>
            </div>
          \`;
        });
        html += '</div>';
        container.innerHTML = html;
        document.querySelectorAll('.edit-post-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const postId = btn.getAttribute('data-id');
            showBlogForm(postId);
          });
        });
        document.querySelectorAll('.delete-post-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const postId = btn.getAttribute('data-id');
            deleteBlogPost(postId);
          });
        });
      } catch (error) {
        container.innerHTML = '<div class="error-message">Error loading posts: ' + error.message + '</div>';
      }
    }
    
    // Show blog post form (create/edit)
    async function showBlogForm(postId = null) {
      const formContainer = document.getElementById('blog-form-container');
      const container = document.getElementById('blog-container');
      formContainer.style.display = 'block';
      container.style.display = 'none';
      let post = { title: '', content: '', image_url: '' };
      if (postId) {
        try {
          const response = await fetch(\`/api/blog/admin/posts/\${postId}\`);
          if (!response.ok) throw new Error('Failed to fetch post');
          post = await response.json();
        } catch (error) {
          showNotification('Error loading post: ' + error.message, 'error');
          return;
        }
      }
      formContainer.innerHTML = \`
        <h3>\${postId ? 'Edit' : 'Create'} Blog Post</h3>
        <form id="blog-post-form">
          <input type="hidden" id="blog-id" value="\${postId || ''}">
          <div class="form-group">
            <label>Title:</label>
            <input type="text" id="blog-title" value="\${post.title || ''}" required>
          </div>
          <div class="form-group">
            <label>Content:</label>
            <textarea id="blog-content" rows="10" required>\${post.content || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Image Upload:</label>
            <input type="file" id="blog-image" accept="image/*">
            \${post.image_url ? \`<img src="\${post.image_url}" style="max-width:120px;">\` : ''}
          </div>
          <button type="submit">\${postId ? 'Save Changes' : 'Create Post'}</button>
          <button type="button" id="cancel-blog-btn">Cancel</button>
        </form>
      \`;
      document.getElementById('cancel-blog-btn').addEventListener('click', () => {
        formContainer.style.display = 'none';
        container.style.display = 'block';
      });
      document.getElementById('blog-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveBlogPost(postId);
      });
    }
    
    // Save blog post (create or update)
    async function saveBlogPost(postId) {
      const form = document.getElementById('blog-post-form');
      const formData = new FormData(form);
      formData.append('title', document.getElementById('blog-title').value);
      formData.append('content', document.getElementById('blog-content').value);
      const imageInput = document.getElementById('blog-image');
      if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
      }
      try {
        const url = postId ? \`/api/blog/admin/posts/\${postId}\` : '/api/blog/admin/posts';
        const method = postId ? 'PUT' : 'POST';
        const response = await fetch(url, { method, body: formData });
        if (!response.ok) throw new Error('Failed to save post');
        showNotification('Post saved successfully', 'success');
        document.getElementById('blog-form-container').style.display = 'none';
        document.getElementById('blog-container').style.display = 'block';
        loadAllBlogPosts();
      } catch (error) {
        showNotification('Error saving post: ' + error.message, 'error');
      }
    }
    
    // Delete blog post
    async function deleteBlogPost(postId) {
      if (!confirm('Are you sure you want to delete this post?')) return;
      try {
        const response = await fetch(\`/api/blog/admin/posts/\${postId}\`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete post');
        showNotification('Post deleted successfully', 'success');
        loadAllBlogPosts();
      } catch (error) {
        showNotification('Error deleting post: ' + error.message, 'error');
      }
    }
  </script>
</body>
</html>`;
}
