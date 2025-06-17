# Code Structure Documentation

## Last Updated: June 16, 2025

This document provides a detailed overview of the codebase structure, highlighting important files, their purposes, and relationships.

## Project Overview

The Farewell/Howdy project consists of two main components:

1. **Frontend Website** - Static HTML/CSS/JS deployed to Cloudflare Pages
2. **Admin Backend** - Cloudflare Worker with TypeScript for API and admin dashboard

## Key Directories and Files

### Frontend (`/home/jeltu/Desktop/fnow/`)

#### Important HTML Files
- `index.html` - Main entry point for the website
- `404.html` - Custom 404 page that serves as a style reference
- `about.htm` - About page
- `booking.htm` - Booking information page
- `menu/index.html` - Menu page

#### CSS Files
- `css/ccssss.css` - Main CSS file with all styles
- `css/3ccssss.css` - Older CSS file (should be moved to backup)
- `css/ccssss2.css` - Alternative CSS file (should be moved to backup)

#### JavaScript Files
- `jss/script.js` - Main JavaScript file for the frontend
  - Handles state switching between Farewell/Howdy
  - Manages events slideshow
  - Handles newsletter signup
- `jss/ifrevl.js` - Helper functions
- `jss/ansik.js` - Animation functions
- `jss/modal.js` - Modal dialog functionality

#### Configuration
- `wrangler.jsonc` - Cloudflare Pages configuration for the frontend

### Admin Backend (`/home/jeltu/Desktop/fnow/admin-worker/fwhyadmin/`)

#### Core Files
- `src/index.ts` - Entry point for the admin worker
- `src/dashboard/admin-dashboard.tsx` - Admin dashboard UI generation
- `wrangler.jsonc` - Cloudflare Worker configuration

#### API Handlers
- `src/handlers/auth.ts` - Authentication endpoints
- `src/handlers/blog.ts` - Blog management endpoints
- `src/handlers/events.ts` - Events management endpoints
- `src/handlers/gallery.ts` - Gallery management endpoints
- `src/handlers/menu.ts` - Menu management endpoints
- `src/handlers/hours.ts` - Hours management endpoints

#### Middleware
- `src/middleware/auth.ts` - Authentication middleware
- `src/middleware/cors.ts` - CORS middleware

#### Types
- `src/types/env.ts` - Environment variable type definitions

## Key Functionality

### State Switching
The website can switch between "Farewell" and "Howdy" states, which changes:
- Color schemes
- Images
- Address information
- Event listings

The switching is handled in `jss/script.js` via the `toggleState()` function.

### Events Management
Events are managed through the admin dashboard with these key functions:
- `loadEventsManager()` - Initializes the events management interface
- `loadEventsForVenue()` - Loads events for a specific venue
- `showEventForm()` - Displays the event creation/editing form
- `saveEvent()` - Saves event data to the backend

### Blog Management
Blog posts are managed through:
- `loadBlogManager()` - Initializes the blog management interface
- `createBlogPost()` - Creates a new blog post
- `editBlogPost()` - Edits an existing blog post
- `deleteBlogPost()` - Deletes a blog post

## Database Structure

### Cloudflare D1 Databases
- `UNIFIED_DB` - Main database for all data
- `BL0WD1_MIGRATION` - Legacy database (migration source)

### KV Namespaces
- `EVENTS_KV` - Stores event data
- `SESSIONS_KV` - Stores session data
- `GALLERY_KV` - Stores gallery data
- `BLOG_KV` - Stores blog posts
- `CONFIG_KV` - Stores configuration data

### R2 Buckets
- `BLOG_IMAGES_R2` - Stores blog images

## Deployment Process

### Frontend Deployment
```bash
cd /home/jeltu/Desktop/fnow
git add .
git commit -m "Update frontend"
npx wrangler deploy
```

### Admin Backend Deployment
```bash
cd /home/jeltu/Desktop/fnow/admin-worker/fwhyadmin
git add .
git commit -m "Update admin backend"
npx wrangler deploy
```

## Known Issues and Recommendations

1. **Template String Issues**:
   - The admin dashboard uses large template strings which cause TypeScript compilation errors
   - Recommendation: Break down template strings or use a proper templating system

2. **Multiple Navigation Systems**:
   - The admin dashboard has inconsistent navigation patterns
   - Recommendation: Standardize on a single navigation approach

3. **Developer Tools in Production**:
   - Too many developer helpers are visible to admin users
   - Recommendation: Create proper error handling and notification systems

4. **Inconsistent Styling**:
   - Admin pages have inconsistent styling
   - Recommendation: Implement a consistent design system based on the 404 page

## Cleanup Recommendations

1. Move these files to a backup directory:
   - `css/3ccssss.css`
   - `css/ccssss2.css`
   - `jss/batch.htm`
   - `jss/batch-upload-legacy.js`
   - `jss/batch-upload-old.js`
   - `jss/ifrevoalds`

2. Consolidate CSS files into a single source of truth

3. Remove all console.log statements from production code

4. Replace all alert() calls with a proper notification system
