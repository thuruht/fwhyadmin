# Farewell/Howdy Unified Admin Backend & API

## Overview

This is the authoritative documentation for the Farewell/Howdy unified admin backend and API. It supersedes all previous docs, plans, and status files. All other documentation files can be archived or deleted.

---

## Features

- Unified CRUD for events and blog posts (legacy + new)
- Quill editor with custom image upload for blog
- Robust API: `/events`, `/blog/posts`, etc.
- All config in `wrangler.jsonc` (no TOML)
- Modern, normalized event and blog data
- Admin dashboard: full CRUD, state switching, error handling
- Logout: clears session/localStorage and reloads

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

---

## Admin Dashboard

- Modern UI for event and blog CRUD
- Quill editor for blog/news (custom image upload, no base64)
- All event fields editable, legacy events included
- Flyer upload uses R2/KV and sets correct URLs

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
