import { IRequest, Router, error, json } from 'itty-router';
import { Env, EventType, OldEventDataType } from '../types/env'; // Ensure OldEventDataType is defined in env.ts
import { authenticate } from '../auth'; // Assuming auth.ts is in src/auth

// Helper to generate a simple slug
function createSlug(text: string): string {
  if (!text) return 'untitled';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

async function fetchAndUploadImage(
  imageUrl: string,
  eventId: string,
  eventTitle: string,
  env: Env,
  r2PublicUrlPrefix: string
): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    console.warn(`Skipping image for event ${eventId}: Invalid or non-HTTP URL: ${imageUrl}`);
    return null; // Skip if not a valid HTTP/HTTPS URL
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image ${imageUrl} for event ${eventId}: ${response.statusText}`);
      return null;
    }
    const imageBlob = await response.blob();
    const contentType = imageBlob.type || 'application/octet-stream';
    const extension = contentType.split('/')[1]?.split('+')[0] || 'jpg'; // e.g. image/jpeg -> jpeg, image/svg+xml -> svg
    const slug = createSlug(eventTitle) || 'event';
    const r2Key = `events/flyers/${slug}-${eventId}.${extension}`;

    await env.BLOG_IMAGES_R2.put(r2Key, imageBlob, {
      httpMetadata: { contentType },
    });
    return `${r2PublicUrlPrefix.replace(/\/$/, '')}/${r2Key}`; // Ensure no double slashes
  } catch (e: any) {
    console.error(`Error fetching/uploading image ${imageUrl} for event ${eventId}: ${e.message}`);
    return null;
  }
}

async function migrateEventsFromKV(kv: KVNamespace, venue: 'farewell' | 'howdy', env: Env, r2PublicUrlPrefix: string) {
  const migratedEvents: any[] = [];
  const errors: any[] = [];
  const listResult = await kv.list();
  console.log(`Found ${listResult.keys.length} keys in ${kv} for venue ${venue}`);

  for (const key of listResult.keys) {
    try {
      const oldEventData = await kv.get<OldEventDataType>(key.name, 'json');
      if (!oldEventData) {
        errors.push({ eventId: key.name, error: 'No data found or not JSON' });
        continue;
      }

      const eventId = oldEventData.id || key.name; // Prefer ID from data, fallback to key
      const eventTitle = oldEventData.title || 'Untitled Event';
      console.log(`Processing event: ${eventTitle} (ID: ${eventId}) from KV key ${key.name}`);

      let newFlyerUrl: string | null = null;
      if (oldEventData.flyer_url) {
        newFlyerUrl = await fetchAndUploadImage(oldEventData.flyer_url, eventId, eventTitle, env, r2PublicUrlPrefix);
      }

      const newEvent: EventType = {
        id: eventId,
        title: eventTitle,
        venue: venue,
        date: oldEventData.date || '1970-01-01', // Default to epoch if missing
        time: oldEventData.time || null,
        description: oldEventData.description || null,
        age_restriction: oldEventData.age_restriction || null,
        suggested_price: oldEventData.suggested_price || null,
        ticket_url: oldEventData.ticket_url || null,
        flyer_url: newFlyerUrl,
        thumbnail_url: null, // Placeholder
        status: oldEventData.status === 'cancelled' || oldEventData.status === 'postponed' ? oldEventData.status : 'active',
        featured: oldEventData.featured || false,
        slideshow_order: typeof oldEventData.slideshow_order === 'number' ? oldEventData.slideshow_order : null,
        created_at: oldEventData.created_at || new Date(0).toISOString(), // Default to epoch if missing
        updated_at: new Date().toISOString(),
        created_by: oldEventData.created_by || 'migration_script',
        last_modified_by: 'migration_script',
      };

      const values = [
        newEvent.id,
        newEvent.title,
        newEvent.venue,
        newEvent.date,
        newEvent.time,
        newEvent.description,
        newEvent.age_restriction,
        newEvent.suggested_price,
        newEvent.ticket_url,
        newEvent.flyer_url,
        newEvent.thumbnail_url,
        newEvent.status,
        newEvent.featured,
        newEvent.slideshow_order,
        newEvent.created_at,
        newEvent.updated_at,
        newEvent.created_by,
        newEvent.last_modified_by
      ];

      const stmt = env.UNIFIED_DB.prepare(
        'INSERT OR REPLACE INTO events (id, title, venue, date, time, description, age_restriction, suggested_price, ticket_url, flyer_url, thumbnail_url, status, featured, slideshow_order, created_at, updated_at, created_by, last_modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(...values);
      await stmt.run();
      migratedEvents.push({ id: newEvent.id, title: newEvent.title, newFlyerUrl });

    } catch (e: any) {
      console.error(`Error processing KV key ${key.name} for venue ${venue}: ${e.message}`, e.stack);
      errors.push({ eventId: key.name, error: e.message, stack: e.stack });
    }
  }
  return { migratedEvents, errors };
}

export async function handleEventMigration(request: IRequest, env: Env, ctx: ExecutionContext): Promise<Response> {
  const authResponse = await authenticate(request, env);
  if (authResponse) return authResponse;

  const R2_PUBLIC_URL_PREFIX = env.R2_PUBLIC_URL_PREFIX || 'https://your-r2-public-url-prefix-here.r2.dev/';
  // ^^^ IMPORTANT: Replace with your actual R2 public URL prefix or ensure R2_PUBLIC_URL_PREFIX is set in wrangler.jsonc/secrets

  if (request.method !== 'POST') {
    return error(405, 'Method Not Allowed. Please use POST.');
  }

  try {
    console.log('Starting Farewell event migration...');
    const farewellResults = await migrateEventsFromKV(env.EVENTS_FAREWELL, 'farewell', env, R2_PUBLIC_URL_PREFIX);
    console.log('Farewell event migration completed. Starting Howdy event migration...');
    const howdyResults = await migrateEventsFromKV(env.EVENTS_HOWDY, 'howdy', env, R2_PUBLIC_URL_PREFIX);
    console.log('Howdy event migration completed.');

    return json({
      message: 'Event migration process completed.',
      farewell: {
        migratedCount: farewellResults.migratedEvents.length,
        errorCount: farewellResults.errors.length,
        migratedEvents: farewellResults.migratedEvents,
        errors: farewellResults.errors,
      },
      howdy: {
        migratedCount: howdyResults.migratedEvents.length,
        errorCount: howdyResults.errors.length,
        migratedEvents: howdyResults.migratedEvents,
        errors: howdyResults.errors,
      },
    });
  } catch (e: any) {
    console.error('Event migration failed:', e);
    return error(500, `Event migration failed: ${e.message}`);
  }
}

// IMPORTANT: 
// 1. Replace \`https://your-r2-public-url-prefix/\` with your actual R2 public bucket URL prefix if you have one.
//    If your R2 bucket is not public, the flyer_url should perhaps just be the R2 key, and another
//    worker/endpoint would be responsible for serving the image from R2.
// 2. Local file paths: This script currently CANNOT access local file system paths directly.
//    If old flyer_url values are local paths (e.g., "/img/flyer.jpg"), you'll need a different strategy:
//    a) Pre-upload these to a temporary accessible web location.
//    b) Create a local script that reads the file and sends its content to a dedicated worker endpoint for upload.
// 3. This script assumes old event data in KV is somewhat similar to the new EventType. Adjust parsing as needed.
// 4. Ensure your `Env` type in `src/types/env.ts` includes `EVENTS_FAREWELL`, `EVENTS_HOWDY`, `BLOG_IMAGES_R2`, 
//    and `UNIFIED_DB` if they are bound in wrangler.jsonc for this migration.
// 5. Error handling and logging can be further improved.
