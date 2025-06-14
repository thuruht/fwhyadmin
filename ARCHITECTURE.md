# Farewell/Howdy Unified System Architecture

## Overview
This document outlines the complete system architecture for the Farewell/Howdy ecosystem, including the unified admin backend, frontend sites, and the separate Howdy DIY Thrift SPA.

## System Components

### 1. Unified Admin Backend (fwhyadmin)
**Repository:** `https://github.com/thuruht/fwhyadmin.git`
**Domain:** `admin.farewellcafe.com`
**Technology:** Cloudflare Workers

**Core Features:**
- **Event Management:** Create, edit, delete events for both venues
- **Flyer Management:** Upload, edit, delete flyers with thumbnails
- **Menu Management:** Edit food/drink menus, prices, availability
- **Hours Management:** Update operating hours for both venues
- **Newsletter Management:** Create and send newsletters via Kit
- **User Management:** Admin authentication and permissions
- **Analytics:** View event attendance, popular items, etc.

**API Endpoints:**
```
Authentication:
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/check

Events:
GET /api/events (unified listing with venue filter)
POST /api/events (create event)
PUT /api/events/:id (update event)
DELETE /api/events/:id (delete event)
GET /api/events/:venue (venue-specific events)

Flyers:
GET /api/flyers (all flyers with thumbnails)
POST /api/flyers (upload flyer)
PUT /api/flyers/:id (update flyer)
DELETE /api/flyers/:id (delete flyer)
GET /api/flyers/:venue (venue-specific slideshow)

Menu:
GET /api/menu/:venue
PUT /api/menu/:venue
GET /api/menu/categories
POST /api/menu/items

Hours:
GET /api/hours/:venue
PUT /api/hours/:venue

Newsletter:
GET /api/newsletter/posts
POST /api/newsletter/posts
PUT /api/newsletter/posts/:id
DELETE /api/newsletter/posts/:id
POST /api/newsletter/send

Gallery:
GET /api/gallery
POST /api/gallery (upload images)
DELETE /api/gallery/:id

Analytics:
GET /api/analytics/events
GET /api/analytics/popular-items
```

### 2. Main Frontend Site (fnow)
**Repository:** Current workspace
**Domain:** `farewellcafe.com`
**Technology:** Cloudflare Workers + Static Assets

**Features:**
- **Unified Show Listings:** Popup with thumbnails from both venues
- **Per-Venue Flyer Slideshows:** Separate slideshows for Farewell/Howdy
- **YouTube Video Carousel:** Multiple videos on homepage
- **Newsletter Integration:** Kit-powered newsletter signup
- **Menu Display:** Dynamic menu from admin backend
- **Hours Display:** Dynamic hours from admin backend
- **Mobile Responsive:** Properly centered content

### 3. Howdy DIY Thrift SPA
**Repository:** New separate repository
**Domain:** `thrift.farewellcafe.com` or `howdythrift.com`
**Technology:** React/Vue.js + Cloudflare Workers API

**Features:**
- **Inventory Management:** Add/edit/remove thrift items
- **Category Organization:** Clothing, accessories, vintage, etc.
- **Photo Gallery:** Multiple photos per item
- **Pricing System:** Dynamic pricing with sales/discounts
- **Search & Filter:** By category, size, price, color
- **Admin Panel:** Separate from main admin
- **Social Integration:** Instagram feed integration
- **Hours Display:** Variable weekly hours

## Enhanced Features

### Flyer Management System
**Upload Process:**
1. Admin uploads flyer image
2. System generates thumbnail
3. Auto-populates venue-specific defaults:
   - **Howdy:** "All ages", "Doors at 7pm / Music at 8pm"
   - **Farewell:** "21+ unless with parent or legal guardian", "Doors at 7pm / Music at 8pm"
4. Admin can edit all fields including ticket URL
5. Flyer appears in venue-specific slideshow
6. Event appears in unified listings

**Slideshow System:**
- Each venue has its own slideshow endpoint
- Unified popup shows all events with thumbnails
- Ability to filter by venue in popup
- Admin can reorder slides
- Admin can remove specific flyers from slideshow

### Event Creation Workflow
1. **Venue Selection:** Choose Farewell, Howdy, or Both
2. **Auto-Population:** Venue-specific defaults loaded
3. **Flyer Upload:** Drag & drop with preview
4. **Event Details:** Title, date, time, description, price
5. **Ticket Integration:** Optional ticket URL
6. **Preview:** See how it will appear on site
7. **Publish:** Goes live immediately or scheduled

### Unified Show Listings
**Popup Features:**
- Grid view with thumbnails
- Venue indicators (Farewell/Howdy icons)
- Date sorting and filtering
- Quick view with event details
- Direct link to ticket purchases
- Social sharing buttons

## Database Schema

### Events Table
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT NOT NULL, -- 'farewell', 'howdy', or 'both'
  date TEXT NOT NULL,
  time TEXT,
  description TEXT,
  price TEXT,
  age_restriction TEXT,
  ticket_url TEXT,
  flyer_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'sold_out'
  created_at INTEGER,
  updated_at INTEGER
);
```

### Flyers Table
```sql
CREATE TABLE flyers (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  venue TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  slideshow_order INTEGER,
  active BOOLEAN DEFAULT true,
  created_at INTEGER,
  FOREIGN KEY (event_id) REFERENCES events(id)
);
```

### Menu Items Table
```sql
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  venue TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  available BOOLEAN DEFAULT true,
  order_index INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);
```

### Thrift Items Table (Separate Database)
```sql
CREATE TABLE thrift_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  size TEXT,
  color TEXT,
  condition TEXT,
  images TEXT, -- JSON array of image URLs
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at INTEGER,
  updated_at INTEGER
);
```

## Development Phases

### Phase 1: Core Admin Backend
- [ ] Event CRUD operations
- [ ] Flyer upload and management
- [ ] Basic authentication
- [ ] Menu management
- [ ] Hours management

### Phase 2: Enhanced Frontend Integration
- [ ] Unified show listings popup
- [ ] Per-venue flyer slideshows
- [ ] YouTube video carousel
- [ ] Mobile responsive fixes

### Phase 3: Howdy DIY Thrift SPA
- [ ] Inventory management system
- [ ] Public thrift store interface
- [ ] Separate admin panel
- [ ] Instagram integration

### Phase 4: Advanced Features
- [ ] Analytics dashboard
- [ ] Newsletter automation
- [ ] Gallery management
- [ ] Social media integration

## Security Considerations
- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration for multiple domains
- Image upload security and size limits
- Admin-only access controls

## Deployment Strategy
- **Admin Backend:** Cloudflare Workers with D1 database
- **Main Site:** Cloudflare Workers with KV storage
- **Thrift SPA:** Cloudflare Pages with Workers API
- **Image Storage:** Cloudflare R2 or Images API
- **CDN:** Cloudflare for all static assets
