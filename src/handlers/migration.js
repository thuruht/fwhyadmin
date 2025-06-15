/**
 * Data Migration Handler
 * 
 * This handler helps migrate data from the existing workers to the unified backend:
 * - Inspect existing KV namespaces and D1 databases
 * - Copy blog posts, events, and flyer data
 * - Transform data to new unified format
 */

/**
 * Handle migration requests
 */
export async function handleMigration(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  try {
    switch (action) {
      case 'inspect':
        return await inspectExistingData(env);
      case 'migrate-blog':
        return await migrateBlogData(env);
      case 'migrate-events':
        return await migrateEventData(env);
      case 'migrate-gallery':
        return await migrateGalleryData(env);
      case 'copy-r2':
        return await copyR2Data(env);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          availableActions: ['inspect', 'migrate-blog', 'migrate-events', 'migrate-gallery', 'copy-r2']
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Migration failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Inspect existing data sources
 */
async function inspectExistingData(env) {
  const report = {
    timestamp: new Date().toISOString(),
    kvNamespaces: {},
    r2Buckets: {},
    summary: {}
  };

  // Check KV namespaces (if they exist in the environment)
  const kvSources = [
    'EVENTS_FAREWELL',
    'EVENTS_HOWDY', 
    'bl0wkv',
    'fff_kv'
  ];

  for (const kvName of kvSources) {
    if (env[kvName]) {
      try {
        // Get a sample of keys to understand structure
        const keys = await env[kvName].list({ limit: 10 });
        report.kvNamespaces[kvName] = {
          available: true,
          sampleKeys: keys.keys.map(k => ({ name: k.name, metadata: k.metadata }))
        };
      } catch (error) {
        report.kvNamespaces[kvName] = {
          available: true,
          error: error.message
        };
      }
    } else {
      report.kvNamespaces[kvName] = { available: false };
    }
  }

  // Check R2 buckets
  try {
    // List objects in legacy R2 bucket
    if (env.R2_BUCKET) {
      const objects = await env.R2_BUCKET.list({ limit: 20 });
      report.r2Buckets.primary = {
        available: true,
        objectCount: objects.objects.length,
        sampleObjects: objects.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          modified: obj.uploaded
        }))
      };
    }
  } catch (error) {
    report.r2Buckets.primary = {
      available: false,
      error: error.message
    };
  }

  // Generate summary
  report.summary = {
    kvNamespacesFound: Object.values(report.kvNamespaces).filter(ns => ns.available).length,
    r2BucketsFound: Object.values(report.r2Buckets).filter(bucket => bucket.available).length,
    migrationRecommendations: generateMigrationRecommendations(report)
  };

  return new Response(JSON.stringify(report, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Migrate blog data from existing sources
 */
async function migrateBlogData(env) {
  const results = {
    timestamp: new Date().toISOString(),
    migrated: 0,
    errors: []
  };

  try {
    // Check if we have access to blog KV (bl0wkv)
    if (env.bl0wkv) {
      // Get all blog posts
      const { keys } = await env.bl0wkv.list();
      
      for (const key of keys) {
        try {
          const data = await env.bl0wkv.get(key.name, 'json');
          
          if (data && typeof data === 'object') {
            // Transform to unified format
            const unifiedPost = {
              id: key.name,
              title: data.title || 'Untitled',
              content: data.content || data.text || '',
              image_url: data.image_url || data.imageUrl || null,
              created_at: data.created_at || data.timestamp || new Date().toISOString(),
              venue: data.venue || 'both', // Default to both venues
              status: 'published'
            };

            // Store in unified blog KV
            await env.BLOG_KV.put(`post_${key.name}`, JSON.stringify(unifiedPost));
            results.migrated++;
          }
        } catch (error) {
          results.errors.push({
            key: key.name,
            error: error.message
          });
        }
      }
    }
  } catch (error) {
    results.errors.push({
      operation: 'blog-migration',
      error: error.message
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Migrate event data from existing sources
 */
async function migrateEventData(env) {
  const results = {
    timestamp: new Date().toISOString(),
    migrated: 0,
    errors: [],
    venues: {
      farewell: 0,
      howdy: 0
    }
  };

  try {
    // Migrate from Farewell events KV
    if (env.EVENTS_FAREWELL) {
      const { keys } = await env.EVENTS_FAREWELL.list();
      
      for (const key of keys) {
        try {
          const data = await env.EVENTS_FAREWELL.get(key.name, 'json');
          
          if (data) {
            const unifiedEvent = transformEventData(data, 'farewell');
            await env.EVENTS_KV.put(`event_${unifiedEvent.id}`, JSON.stringify(unifiedEvent));
            results.migrated++;
            results.venues.farewell++;
          }
        } catch (error) {
          results.errors.push({
            key: key.name,
            venue: 'farewell',
            error: error.message
          });
        }
      }
    }

    // Migrate from Howdy events KV
    if (env.EVENTS_HOWDY) {
      const { keys } = await env.EVENTS_HOWDY.list();
      
      for (const key of keys) {
        try {
          const data = await env.EVENTS_HOWDY.get(key.name, 'json');
          
          if (data) {
            const unifiedEvent = transformEventData(data, 'howdy');
            await env.EVENTS_KV.put(`event_${unifiedEvent.id}`, JSON.stringify(unifiedEvent));
            results.migrated++;
            results.venues.howdy++;
          }
        } catch (error) {
          results.errors.push({
            key: key.name,
            venue: 'howdy',
            error: error.message
          });
        }
      }
    }
  } catch (error) {
    results.errors.push({
      operation: 'event-migration',
      error: error.message
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Migrate gallery/flyer data
 */
async function migrateGalleryData(env) {
  const results = {
    timestamp: new Date().toISOString(),
    migrated: 0,
    errors: []
  };

  try {
    // Check if we have access to gallery KV (fff_kv)
    if (env.fff_kv) {
      const { keys } = await env.fff_kv.list();
      
      for (const key of keys) {
        try {
          const data = await env.fff_kv.get(key.name, 'json');
          
          if (data) {
            // Transform to unified format
            const unifiedFlyer = {
              id: key.name,
              title: data.title || 'Untitled Event',
              date: data.date || new Date().toISOString().split('T')[0],
              time: data.time || '',
              venue: data.venue || data.type || 'farewell',
              description: data.description || '',
              flyer_url: data.imageUrl || data.flyerUrl || '',
              thumbnail_url: data.thumbnailUrl || data.flyerThumbnail || data.imageUrl || data.flyerUrl || '',
              suggested_price: data.suggestedPrice || '',
              ticket_url: data.ticketLink || '',
              created_at: data.created || new Date().toISOString(),
              status: 'published'
            };

            // Store in unified gallery KV
            await env.GALLERY_KV.put(`flyer_${key.name}`, JSON.stringify(unifiedFlyer));
            results.migrated++;
          }
        } catch (error) {
          results.errors.push({
            key: key.name,
            error: error.message
          });
        }
      }
    }
  } catch (error) {
    results.errors.push({
      operation: 'gallery-migration',
      error: error.message
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Copy R2 data between buckets (backup existing data to new bucket)
 */
async function copyR2Data(env) {
  const results = {
    timestamp: new Date().toISOString(),
    copied: 0,
    errors: [],
    note: "Copying from existing production bucket (fyg410r3) to new backup bucket (unified-assets-dev)"
  };

  try {
    if (env.R2_BUCKET && env.NEW_BUCKET) {
      // List objects in existing production bucket
      const objects = await env.R2_BUCKET.list({ limit: 100 });
      
      for (const obj of objects.objects) {
        try {
          // Get object from existing production bucket
          const sourceObject = await env.R2_BUCKET.get(obj.key);
          
          if (sourceObject) {
            // Copy to new backup bucket
            await env.NEW_BUCKET.put(obj.key, sourceObject.body, {
              httpMetadata: sourceObject.httpMetadata,
              customMetadata: sourceObject.customMetadata
            });
            results.copied++;
          }
        } catch (error) {
          results.errors.push({
            key: obj.key,
            error: error.message
          });
        }
      }
    }
  } catch (error) {
    results.errors.push({
      operation: 'r2-copy',
      error: error.message
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Transform event data to unified format
 */
function transformEventData(eventData, venue) {
  return {
    id: eventData.id || crypto.randomUUID(),
    title: eventData.title || 'Untitled Event',
    date: eventData.date || new Date().toISOString().split('T')[0],
    time: eventData.time || (venue === 'howdy' ? 'All ages' : 'Doors at 7pm / Music at 8pm'),
    venue: venue,
    description: eventData.description || '',
    flyer_url: eventData.flyerUrl || eventData.imageUrl || '',
    thumbnail_url: eventData.flyerThumbnail || eventData.flyerUrl || eventData.imageUrl || '',
    suggested_price: eventData.suggestedPrice || '',
    ticket_url: eventData.ticketLink || '',
    age_restriction: venue === 'howdy' ? 'All ages' : '21+ unless with parent or legal guardian',
    created_at: eventData.created || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'published',
    source: 'migration'
  };
}

/**
 * Generate migration recommendations
 */
function generateMigrationRecommendations(report) {
  const recommendations = [];
  
  if (report.kvNamespaces.bl0wkv?.available) {
    recommendations.push('Run migrate-blog to copy blog posts');
  }
  
  if (report.kvNamespaces.EVENTS_FAREWELL?.available || report.kvNamespaces.EVENTS_HOWDY?.available) {
    recommendations.push('Run migrate-events to copy event data');
  }
  
  if (report.kvNamespaces.fff_kv?.available) {
    recommendations.push('Run migrate-gallery to copy flyer data');
  }
  
  if (report.r2Buckets.primary?.available) {
    recommendations.push('Run copy-r2 to copy image files');
  }
  
  return recommendations;
}
