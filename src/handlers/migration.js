/**
 * Data Migration Handler
 * 
 * Comprehensive migration handler that inspects and migrates data from all possible sources:
 * - KV namespaces (legacy and new)
 * - D1 databases 
 * - R2 buckets
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
        return await inspectAllDataSources(env);
      case 'inspect-kv':
        return await inspectKVNamespaces(env);
      case 'inspect-d1':
        return await inspectD1Databases(env);
      case 'inspect-r2':
        return await inspectR2Buckets(env);
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
          availableActions: [
            'inspect', 'inspect-kv', 'inspect-d1', 'inspect-r2',
            'migrate-blog', 'migrate-events', 'migrate-gallery', 'copy-r2'
          ]
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      error: 'Migration failed',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Comprehensive inspection of all data sources
 */
async function inspectAllDataSources(env) {
  const results = {
    timestamp: new Date().toISOString(),
    kvNamespaces: {},
    d1Databases: {},
    r2Buckets: {},
    summary: {}
  };

  // Inspect all KV namespaces
  const kvResults = await inspectKVNamespaces(env);
  const kvData = await kvResults.json();
  results.kvNamespaces = kvData.kvNamespaces;

  // Inspect all D1 databases
  const d1Results = await inspectD1Databases(env);
  const d1Data = await d1Results.json();
  results.d1Databases = d1Data.d1Databases;

  // Inspect all R2 buckets
  const r2Results = await inspectR2Buckets(env);
  const r2Data = await r2Results.json();
  results.r2Buckets = r2Data.r2Buckets;

  // Generate summary
  results.summary = {
    kvNamespacesFound: Object.keys(results.kvNamespaces).length,
    d1DatabasesFound: Object.keys(results.d1Databases).length,
    r2BucketsFound: Object.keys(results.r2Buckets).length,
    totalDataSources: Object.keys(results.kvNamespaces).length + 
                     Object.keys(results.d1Databases).length + 
                     Object.keys(results.r2Buckets).length
  };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Inspect all KV namespaces
 */
async function inspectKVNamespaces(env) {
  const kvNamespaces = {
    // New unified namespaces
    EVENTS_KV: env.EVENTS_KV,
    SESSIONS_KV: env.SESSIONS_KV,
    GALLERY_KV: env.GALLERY_KV,
    BLOG_KV: env.BLOG_KV,
    CONFIG_KV: env.CONFIG_KV,
    
    // Legacy namespaces
    EVENTS_FAREWELL: env.EVENTS_FAREWELL,
    EVENTS_HOWDY: env.EVENTS_HOWDY,
    bl0wkv: env.bl0wkv,
    fff_kv: env.fff_kv
  };

  const results = {
    timestamp: new Date().toISOString(),
    kvNamespaces: {}
  };

  for (const [name, namespace] of Object.entries(kvNamespaces)) {
    if (!namespace) {
      results.kvNamespaces[name] = {
        available: false,
        error: 'Namespace not bound'
      };
      continue;
    }

    try {
      // Get list of keys (limit to 10 for inspection)
      const keyList = await namespace.list({ limit: 10 });
      const sampleKeys = keyList.keys || [];
      
      // Get sample data from first few keys
      const sampleData = {};
      for (let i = 0; i < Math.min(3, sampleKeys.length); i++) {
        const key = sampleKeys[i];
        try {
          const value = await namespace.get(key.name);
          if (value) {
            // Try to parse as JSON, truncate if too long
            let parsedValue = value;
            try {
              parsedValue = JSON.parse(value);
              if (typeof parsedValue === 'object' && parsedValue !== null) {
                parsedValue = JSON.stringify(parsedValue, null, 2).substring(0, 500) + '...';
              }
            } catch (e) {
              // Keep as string, but truncate
              parsedValue = value.substring(0, 500) + (value.length > 500 ? '...' : '');
            }
            sampleData[key.name] = parsedValue;
          }
        } catch (error) {
          sampleData[key.name] = `Error reading value: ${error.message}`;
        }
      }

      results.kvNamespaces[name] = {
        available: true,
        keyCount: keyList.keys?.length || 0,
        sampleKeys: sampleKeys.map(k => ({ name: k.name, expiration: k.expiration })),
        sampleData: sampleData
      };
    } catch (error) {
      results.kvNamespaces[name] = {
        available: false,
        error: error.message
      };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Inspect all D1 databases
 */
async function inspectD1Databases(env) {
  const databases = {
    bl0wd1: env.bl0wd1,
    farewell_list: env.farewell_list,
    howdy_list: env.howdy_list,
    fwhygal0r3_db: env.fwhygal0r3_db
  };

  const results = {
    timestamp: new Date().toISOString(),
    d1Databases: {}
  };

  for (const [name, db] of Object.entries(databases)) {
    if (!db) {
      results.d1Databases[name] = {
        available: false,
        error: 'Database not bound'
      };
      continue;
    }

    try {
      // Try to get table information
      const tablesQuery = await db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const tables = tablesQuery.results || [];
      const tableInfo = {};

      // Get row counts and sample data from each table
      for (const table of tables.slice(0, 5)) { // Limit to 5 tables
        try {
          const countQuery = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first();
          const sampleQuery = await db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
          
          tableInfo[table.name] = {
            rowCount: countQuery?.count || 0,
            sampleRows: sampleQuery.results || []
          };
        } catch (error) {
          tableInfo[table.name] = {
            error: `Error accessing table: ${error.message}`
          };
        }
      }

      results.d1Databases[name] = {
        available: true,
        tableCount: tables.length,
        tables: tables.map(t => t.name),
        tableInfo: tableInfo
      };
    } catch (error) {
      results.d1Databases[name] = {
        available: false,
        error: error.message
      };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Inspect all R2 buckets
 */
async function inspectR2Buckets(env) {
  const buckets = {
    R2_BUCKET: env.R2_BUCKET,
    NEW_BUCKET: env.NEW_BUCKET
  };

  const results = {
    timestamp: new Date().toISOString(),
    r2Buckets: {}
  };

  for (const [name, bucket] of Object.entries(buckets)) {
    if (!bucket) {
      results.r2Buckets[name] = {
        available: false,
        error: 'Bucket not bound'
      };
      continue;
    }

    try {
      // List objects (limit to 20 for inspection)
      const objectList = await bucket.list({ limit: 20 });
      const objects = objectList.objects || [];

      results.r2Buckets[name] = {
        available: true,
        objectCount: objects.length,
        truncated: objectList.truncated || false,
        sampleObjects: objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          modified: obj.uploaded?.toISOString(),
          etag: obj.etag
        }))
      };
    } catch (error) {
      results.r2Buckets[name] = {
        available: false,
        error: error.message
      };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Migrate blog data from legacy sources
 */
async function migrateBlogData(env) {
  const results = {
    timestamp: new Date().toISOString(),
    migrated: 0,
    errors: []
  };

  try {
    // Migrate from bl0wkv (legacy blog KV)
    if (env.bl0wkv && env.BLOG_KV) {
      const keyList = await env.bl0wkv.list();
      
      for (const key of keyList.keys || []) {
        try {
          const value = await env.bl0wkv.get(key.name);
          if (value) {
            // Transform legacy format to new unified format
            let blogData;
            try {
              blogData = JSON.parse(value);
            } catch (e) {
              blogData = { content: value, title: key.name };
            }

            const unifiedData = {
              id: key.name,
              title: blogData.title || key.name,
              content: blogData.content || value,
              author: blogData.author || 'admin',
              published: blogData.published || true,
              createdAt: blogData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tags: blogData.tags || [],
              venue: blogData.venue || 'both'
            };

            await env.BLOG_KV.put(`blog:${key.name}`, JSON.stringify(unifiedData));
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating blog key ${key.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Blog migration error: ${error.message}`);
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Migrate event data from legacy sources
 */
async function migrateEventData(env) {
  const results = {
    timestamp: new Date().toISOString(),
    migrated: 0,
    errors: [],
    venues: { farewell: 0, howdy: 0 }
  };

  try {
    // Migrate from EVENTS_FAREWELL
    if (env.EVENTS_FAREWELL && env.EVENTS_KV) {
      const farewellKeys = await env.EVENTS_FAREWELL.list();
      
      for (const key of farewellKeys.keys || []) {
        try {
          const value = await env.EVENTS_FAREWELL.get(key.name);
          if (value) {
            let eventData;
            try {
              eventData = JSON.parse(value);
            } catch (e) {
              eventData = { content: value };
            }

            // Transform to unified format
            const unifiedData = {
              id: `farewell_${key.name}`,
              venue: 'farewell',
              title: eventData.title || 'Event',
              description: eventData.description || eventData.content || '',
              date: eventData.date || new Date().toISOString(),
              time: eventData.time || '20:00',
              price: eventData.price || null,
              ticketLink: eventData.ticketLink || null,
              imageUrl: eventData.imageUrl || null,
              featured: eventData.featured || false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await env.EVENTS_KV.put(`event:farewell:${key.name}`, JSON.stringify(unifiedData));
            results.venues.farewell++;
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating farewell event ${key.name}: ${error.message}`);
        }
      }
    }

    // Migrate from EVENTS_HOWDY
    if (env.EVENTS_HOWDY && env.EVENTS_KV) {
      const howdyKeys = await env.EVENTS_HOWDY.list();
      
      for (const key of howdyKeys.keys || []) {
        try {
          const value = await env.EVENTS_HOWDY.get(key.name);
          if (value) {
            let eventData;
            try {
              eventData = JSON.parse(value);
            } catch (e) {
              eventData = { content: value };
            }

            // Transform to unified format
            const unifiedData = {
              id: `howdy_${key.name}`,
              venue: 'howdy',
              title: eventData.title || 'Event',
              description: eventData.description || eventData.content || '',
              date: eventData.date || new Date().toISOString(),
              time: eventData.time || '20:00',
              price: eventData.price || null,
              ticketLink: eventData.ticketLink || null,
              imageUrl: eventData.imageUrl || null,
              featured: eventData.featured || false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await env.EVENTS_KV.put(`event:howdy:${key.name}`, JSON.stringify(unifiedData));
            results.venues.howdy++;
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating howdy event ${key.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Event migration error: ${error.message}`);
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Migrate gallery/flyer data from legacy sources
 */
async function migrateGalleryData(env) {
  const results = {
    timestamp: new Date().toISOString(),
    migrated: 0,
    errors: []
  };

  try {
    // Migrate from fff_kv (legacy gallery KV)
    if (env.fff_kv && env.GALLERY_KV) {
      const keyList = await env.fff_kv.list();
      
      for (const key of keyList.keys || []) {
        try {
          const value = await env.fff_kv.get(key.name);
          if (value) {
            let galleryData;
            try {
              galleryData = JSON.parse(value);
            } catch (e) {
              galleryData = { content: value };
            }

            // Transform to unified format
            const unifiedData = {
              id: key.name,
              venue: key.name.includes('howdy') ? 'howdy' : 'farewell',
              title: galleryData.title || 'Gallery Item',
              description: galleryData.description || '',
              imageUrl: galleryData.imageUrl || galleryData.url || '',
              thumbnailUrl: galleryData.thumbnailUrl || null,
              category: galleryData.category || 'flyer',
              featured: galleryData.featured || false,
              createdAt: galleryData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await env.GALLERY_KV.put(`gallery:${key.name}`, JSON.stringify(unifiedData));
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating gallery key ${key.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Gallery migration error: ${error.message}`);
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Copy R2 objects from legacy bucket to new bucket
 */
async function copyR2Data(env) {
  const results = {
    timestamp: new Date().toISOString(),
    copied: 0,
    errors: [],
    note: 'Copying from existing production bucket (fyg410r3) to new backup bucket (unified-assets-dev)'
  };

  try {
    if (env.R2_BUCKET && env.NEW_BUCKET) {
      // List all objects in the source bucket
      let truncated = true;
      let cursor;
      
      while (truncated) {
        const listResult = await env.R2_BUCKET.list({ 
          limit: 100,
          cursor: cursor
        });
        
        for (const object of listResult.objects || []) {
          try {
            // Get the object from source bucket
            const sourceObject = await env.R2_BUCKET.get(object.key);
            if (sourceObject) {
              // Copy to destination bucket
              await env.NEW_BUCKET.put(object.key, sourceObject.body, {
                httpMetadata: sourceObject.httpMetadata,
                customMetadata: sourceObject.customMetadata
              });
              results.copied++;
            }
          } catch (error) {
            results.errors.push(`Error copying object ${object.key}: ${error.message}`);
          }
        }
        
        truncated = listResult.truncated;
        cursor = listResult.cursor;
      }
    }
  } catch (error) {
    results.errors.push(`R2 copy error: ${error.message}`);
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}
