// src/types/env.ts

export interface Env {
  // KV Namespaces
  EVENTS_KV: KVNamespace;
  SESSIONS_KV: KVNamespace;
  GALLERY_KV: KVNamespace;
  BLOG_KV: KVNamespace;
  CONFIG_KV: KVNamespace;
  
  // Legacy KV Namespaces (for migration)
  EVENTS_FAREWELL: KVNamespace;
  EVENTS_HOWDY: KVNamespace;
  bl0wkv: KVNamespace;
  fff_kv: KVNamespace;
  
  // D1 Databases
  bl0wd1: D1Database;
  farewell_list: D1Database;
  howdy_list: D1Database;
  fwhygal0r3_db: D1Database;
  
  // R2 Buckets
  R2_BUCKET: R2Bucket;
  NEW_BUCKET: R2Bucket;
  BLOG_IMAGES_R2: R2Bucket;
  
  // Environment Variables
  ENVIRONMENT: string;
  R2_PUBLIC_URL_PREFIX: string;
  
  // Auth Secrets
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  
  // Secrets (defined via wrangler secret put)
  ADMIN_PASSWORD?: string;
  UPLOAD_PASSWORD?: string;
  SESSION_SECRET?: string;
  NEWSLETTER_API_KEY?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Event Types
export interface Event {
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

// Blog Post Types
export interface BlogPost {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  slug?: string; // for SEO friendly URLs
}

// Session Types
export interface SessionData {
  userId: string;
  username: string;
  role: string;
  expires: number;
}

// Menu Types
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  category: 'food' | 'drinks' | 'specials';
  venue: 'farewell' | 'howdy' | 'both';
  available: boolean;
  created_at: string;
  updated_at: string;
}

// Operating Hours Types
export interface OperatingHours {
  venue: 'farewell' | 'howdy';
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
  special_hours?: string;
  updated_at: string;
}

// Gallery Types
export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  venue: 'farewell' | 'howdy' | 'both';
  category: 'flyers' | 'photos' | 'art';
  event_id?: string;
  created_at: string;
  updated_at: string;
}
