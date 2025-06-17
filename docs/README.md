# README

// ...existing code...

# Farewell/Howdy Unified Admin Backend

This is the unified admin backend for the Farewell and Howdy venues, built as a Cloudflare Worker with comprehensive management capabilities.

## Features

### ✅ Core Functionality
- **Event Management**: Create, edit, delete events for both venues
- **Flyer Management**: Upload, manage, and organize flyers with thumbnails
- **Unified Calendar**: Merged calendar system for both venues (PRIORITY ITEM)
- **Admin Dashboard**: Comprehensive web interface for management
- **Session-Based Authentication**: Secure login system with session management
- **Newsletter Integration**: Kit (ConvertKit) powered newsletter system
- **Hours Management**: Operating hours updated with spring schedule

### 🔄 In Development
- **Menu Management**: Edit food/drink menus and prices
- **Slideshow Management**: Organize flyer slideshows per venue
- **Analytics**: View event statistics and engagement

### 📋 Planned Features
- **Batch Upload**: Enhanced batch flyer upload with event creation
- **YouTube Video Carousel**: Manage homepage video carousel
- **Street Team Management**: "Farewell Flyer Friends" program management
- **API Integration**: Enhanced frontend integration

## Quick Start

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Set up KV stores (run once)
wrangler kv:namespace create "EVENTS_KV"
wrangler kv:namespace create "SESSIONS_KV"
wrangler kv:namespace create "GALLERY_KV"
wrangler kv:namespace create "BLOG_KV"
wrangler kv:namespace create "CONFIG_KV"
```

### 2. Configuration

Update `wrangler.toml` with your actual KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "EVENTS_KV"
id = "your-actual-events-kv-id"
preview_id = "your-actual-events-kv-preview-id"

[[kv_namespaces]]
binding = "SESSIONS_KV"
id = "your-actual-sessions-kv-id"
preview_id = "your-actual-sessions-kv-preview-id"
```

### 3. Development

```bash
# Run locally
npm run dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### 4. Access the Admin

- **Local**: `http://localhost:8787`
- **Staging**: `https://fwhyadmin-staging.your-subdomain.workers.dev`
- **Production**: `https://admin.farewellcafe.com`

**Default Login Credentials:**
- Username: `admin`
- Password: `farewell2025`

## API Endpoints

### Authentication
```
POST /api/auth/login     # Login and get session
POST /api/auth/logout    # Logout and clear session
GET  /api/auth/check     # Check authentication status
```

### Events (Public)
```
GET /api/events/list?venue=all&thumbnails=true
GET /api/events/slideshow?venue=farewell
```

### Events (Admin)
```
POST /api/events         # Create event
PUT  /api/events/:id     # Update event
DELETE /api/events/:id   # Delete event
POST /api/events/reorder # Reorder slideshow
```

### Flyers (Admin)
```
GET /api/flyers          # List all flyers
POST /api/flyers         # Upload flyer
PUT /api/flyers/:id      # Update flyer
DELETE /api/flyers/:id   # Delete flyer
```

### Menu (Public/Admin)
```
GET /api/menu/public/:venue    # Get menu for venue
PUT /api/menu/:venue           # Update menu (admin)
```

### Hours (Public/Admin)
```
GET /api/hours/public/:venue   # Get hours for venue
PUT /api/hours/:venue          # Update hours (admin)
```

## Todo List Implementation

This backend addresses the specific requirements from the venue promoter:

### ✅ Completed
- [x] **AriZona iced tea added to menu** - $2.50 (implemented in menu handler)
- [x] **Mobile content centering** - Fixed in frontend
- [x] **Disable AI auto-populating** - Removed from flyer uploader
- [x] **Auto-populate venue defaults**:
  - Howdy: "All ages" 
  - Farewell: "21+ unless with parent or legal guardian"
  - Both: "Doors at 7pm / Music at 8pm"
- [x] **Hours section updated** - Spring hours implemented

### 🔄 In Progress
- [ ] **FIRST PRIORITY: Merge Farewell/Howdy calendars** - Backend ready, frontend integration needed
- [ ] **Change street team email** - Setting available in admin dashboard
- [ ] **Add suggested price and ticket URL fields** - Implemented in event creation
- [ ] **Flyer management system** - Edit/delete functionality added

### 📋 Planned
- [ ] **YouTube video carousel** - Admin interface for managing homepage videos
- [ ] **T-shirt/sticker webstore** - Product management system
- [ ] **Image gallery page** - Event photo management
- [ ] **Show history/archive** - Fugazi-style archive system

## Frontend Integration

### JavaScript Integration

```javascript
// Get unified event listings with thumbnails
const response = await fetch('https://admin.farewellcafe.com/api/events/list?venue=all&thumbnails=true');
const data = await response.json();

// Get venue-specific slideshow
const slideshowResponse = await fetch('https://admin.farewellcafe.com/api/events/slideshow?venue=farewell');
const slideshow = await slideshowResponse.json();

// Create event popup with thumbnails
const events = data.events.map(event => ({
  title: event.title,
  date: event.date_formatted,
  venue: event.venue_display,
  thumbnail: event.thumbnail_url,
  time: event.default_time,
  age: event.age_restriction,
  price: event.suggested_price,
  ticketUrl: event.ticket_url
}));
```

### CORS Configuration

The backend automatically handles CORS for the following origins:
- `https://farewellcafe.com`
- `https://dev.farewellcafe.com`
- `http://localhost:*` (development)

## Database Schema

### Events
```javascript
{
  id: "unique-event-id",
  title: "Event Title",
  venue: "farewell|howdy",
  date: "2025-06-15",
  time: "Doors at 7pm / Music at 8pm",
  age_restriction: "21+ unless with parent or legal guardian",
  suggested_price: "$10-15",
  description: "Event description",
  ticket_url: "https://tickets.example.com",
  flyer_url: "https://r2.url/flyer.jpg",
  thumbnail_url: "https://r2.url/thumb.jpg",
  created_at: "2025-06-14T12:00:00Z",
  updated_at: "2025-06-14T12:00:00Z"
}
```

### Flyers
```javascript
{
  id: "unique-flyer-id",
  event_id: "associated-event-id",
  venue: "farewell|howdy",
  title: "Flyer Title",
  file_url: "https://r2.url/flyer.jpg",
  thumbnail_url: "https://r2.url/thumb.jpg",
  order: 1,
  created_at: "2025-06-14T12:00:00Z"
}
```

## Security

- **Session-based authentication** with HTTP-only cookies
- **CORS protection** for cross-origin requests
- **Input validation** for all API endpoints
- **Rate limiting** (planned)
- **API key support** for external integrations

## Development Notes

### Local Development
```bash
# Start development server
wrangler dev

# Test with local KV
wrangler dev --local

# View logs
wrangler tail
```

### Deployment
```bash
# Deploy to production
wrangler deploy --env production

# Check deployment status
wrangler deployments list
```

### KV Management
```bash
# List KV namespaces
wrangler kv:namespace list

# Add test data
wrangler kv:key put --binding=EVENTS_KV "events:all" '[{"id":"test","title":"Test Event"}]'

# Get data
wrangler kv:key get --binding=EVENTS_KV "events:all"
```

## Support

For issues and feature requests, create an issue in the GitHub repository or contact the development team.

## License

This project is private and proprietary to Farewell/Howdy venues.
