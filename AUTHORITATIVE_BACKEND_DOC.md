# Farewell/Howdy Unified Admin Backend & API

## Overview

This is the authoritative documentation for the Farewell/Howdy unified admin backend and API. It supersedes all previous docs, plans, and status files. All other documentation files can be archived or deleted.

---

## Unified Admin Backend (fwhyadmin)

### Features

- Unified CRUD for events and blog posts (legacy + new)
- Quill editor with custom image upload for blog
- Robust API: `/events`, `/blog/posts`, `/menu`, etc.
- All config in `wrangler.jsonc` (no TOML)
- Modern, normalized event, blog, and menu data
- Admin dashboard: full CRUD, state switching, error handling, and professional sidebar/card layout
- Logout: clears session/localStorage and reloads
- Import legacy events/flyers from https://fygw0.kcmo.xyz (auto weekly + manual button)
- Drinks menu and other content can be edited via dashboard (see Menu section)

### Event Data

- Merges legacy (`events:all`, `events:farewell`, `events:howdy` in GALLERY_KV), new (`event_*` in EVENTS_KV), and all events from `EVENTS_HOWDY` and `EVENTS_FAREWELL` (from legacy worker)
- Imports and normalizes all real/old events/flyers from https://fygw0.kcmo.xyz weekly and on demand
- Normalizes fields: id, title, venue, date, time, description, age_restriction, suggested_price, ticket_url, flyer_url, thumbnail_url, status, featured, slideshow_order, created_at, updated_at, created_by, last_modified_by
- `/api/events/list` returns `{ events, total, venue, limit, thumbnails }` (all merged)
- All old and new flyers and events are visible and editable in the admin dashboard
- Flyer upload saves to R2 and sets flyer_url/thumbnail_url for frontend display
- Fully compatible with new frontend and legacy data

### Blog Data

- CRUD for blog posts, Quill content, image upload to R2

### Menu Data

- CRUD for drinks menu and other menu items (editable via dashboard)
- Menu data served via `/api/menu` for frontend display

### Auth/Logout

- Admin session is frontend-only (localStorage/sessionStorage/cookie)
- Logout button clears all and reloads

### Interoperability

- Backend merges all event/flyer data from legacy and new sources
- Fully compatible with new frontend and preserves all old site data
- No dependency on old endpoints, but can import from them if needed

### Deployment

- All config in `wrangler.jsonc` (modern compatibility date)
- Deploy with `npx wrangler deploy` from project root

---

## Data Model

### Event

```typescript
 type Event = {
   id: string;
   title: string;
   venue: 'farewell' | 'howdy';
   date: string;
   time?: string;
   description?: string;
   age_restriction?: string;
   suggested_price?: string;
   ticket_url?: string;
   flyer_url?: string;
   thumbnail_url?: string;
   status: 'active' | 'cancelled' | 'postponed';
   featured: boolean;
   slideshow_order?: number;
   created_at: string;
   updated_at: string;
   created_by: string;
   last_modified_by: string;
 }
```

### BlogPost

```typescript
 type BlogPost = {
   id: number;
   title: string;
   content: string;
   image_url?: string;
   created_at: string;
   updated_at?: string;
 }
```

---

## API Endpoints

### Auth

- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/check` — Check session

### Events

- `GET /api/events/list?venue=...` — List all events (merged legacy + new)
- `POST /api/events` — Create event (with flyer upload)
- `PUT /api/events/:id` — Update event
- `DELETE /api/events/:id` — Delete event

### Flyers

- `POST /api/gallery/flyer` — Upload flyer (R2/KV)
- `GET /api/gallery/flyer/:filename` — Get flyer image
- `GET /api/gallery/thumbnail/:filename` — Get flyer thumbnail

### Blog/Newsletter

- `GET /api/blog/posts` — List blog posts
- `POST /api/blog/posts` — Create post (Quill, image upload)
- `PUT /api/blog/posts/:id` — Update post
- `DELETE /api/blog/posts/:id` — Delete post
- `POST /api/blog/posts/upload-image` — Upload blog image

### Menu

- `GET /api/menu` — List menu items
- `POST /api/menu` — Create menu item
- `PUT /api/menu/:id` — Update menu item
- `DELETE /api/menu/:id` — Delete menu item

---

## Admin Dashboard

- Modern UI for event and blog CRUD
- Quill editor for blog/news (custom image upload, no base64)
- All event fields editable, legacy events included
- Flyer upload uses R2/KV and sets correct URLs
- Professional sidebar/card layout
- Editable menu and content sections

---

## Storage

- **EVENTS_KV**: All new events
- **GALLERY_KV**: Legacy events, flyers, thumbnails
- **R2_BUCKET**: New flyer/image storage
- **BLOG_KV**: Blog/newsletter posts

---

## Migration/Legacy

- All legacy events and flyers are merged and normalized at runtime
- Old keys: `events:all`, `events:farewell`, `events:howdy` (in GALLERY_KV)
- New events use `event_*` keys in EVENTS_KV

---

## Quick Start

1. `npm install`
2. Edit and use only `wrangler.jsonc` (never TOML). Example below.
3. Make sure `compatibility_date` is always set to a recent date (e.g. `2025-06-15` or newer).
4. `wrangler dev` to run locally
5. Visit `/admin` for dashboard

---

## Example wrangler.jsonc

```jsonc
{
  "name": "fwhyadmin",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-15",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },
  "vars": {
    "R2_PUBLIC_URL_PREFIX": "https://fwhy-bimg.farewellcafe.com",
    "ENVIRONMENT": "production"
  },
  "kv_namespaces": [
    { "binding": "EVENTS_KV", "id": "..." },
    { "binding": "SESSIONS_KV", "id": "..." },
    { "binding": "GALLERY_KV", "id": "..." },
    { "binding": "BLOG_KV", "id": "..." },
    { "binding": "CONFIG_KV", "id": "..." }
  ],
  "d1_databases": [
    { "binding": "UNIFIED_DB", "database_name": "fwhy_uni_db", "database_id": "..." }
  ]
}
```

---

## Contact

For questions, see this file or contact the project maintainer.

---

*This is the only authoritative documentation. All other docs can be archived.*

---

_Last updated: 2025-06-17_
