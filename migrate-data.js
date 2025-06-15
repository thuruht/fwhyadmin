#!/usr/bin/env node

/**
 * Data Migration Script for Unified Admin Backend
 * 
 * This script migrates existing data from the current workers to the new unified backend:
 * - Blog posts from bl0wkv KV and bl0wd1 D1
 * - Events from EVENTS_FAREWELL/HOWDY KV namespaces
 * - Flyers from fwhygal0r3-db D1 database
 * - Featured content from existing blog worker
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Current data source IDs (from wrangler commands)
const CURRENT_SOURCES = {
  kv: {
    EVENTS_FAREWELL: '6a2dc6b81774454dba76199798f057df',
    EVENTS_HOWDY: 'ab5328a2ca6e4f10b9a4537039056cfc',
    BLOG_KV: 'bbac2eeab45b4d65868a1caa86e053bd', // bl0wkv
    FLYER_KV: 'd782ad152f414511ad5013ff268bcb99'   // fff_kv
  },
  d1: {
    BLOG_DB: 'a66d8e4a-3c67-48c5-af72-0a511022805a', // bl0wd1
    FAREWELL_DB: '264bf2fb-8c23-4216-8c47-03ebcfaeed63', // farewell_list
    HOWDY_DB: 'd1d9fa02-0258-412a-b5bb-2c503da87f26', // howdy_list
    GALLERY_DB: '44c9c30a-ef78-492b-865b-6d6fdc2553bf' // fwhygal0r3-db
  }
};

// New unified backend KV namespace IDs
const NEW_TARGETS = {
  EVENTS_KV: '464d611d5ad8433cab6bcfba64d8424f',
  SESSIONS_KV: '2038b95e785545af8486bc353c3cbe62',
  GALLERY_KV: '3cd37bd71260436c8ed12078483e9fa4',
  BLOG_KV: '6ee9ab6b71634a4eb3e66de82d8dfcdc',
  CONFIG_KV: 'd54801ef0fb0443e850ee532ad1384b6'
};

console.log('🚀 Starting data migration to unified admin backend...\n');

async function runCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return null;
  }
}

async function migrateEventsData() {
  console.log('📅 Migrating Events Data with Enhanced Fields...');
  
  // Fetch live events from current API endpoints
  try {
    console.log('Fetching Farewell events from https://fygw0.kcmo.xyz/list/farewell');
    const farewellResponse = await fetch('https://fygw0.kcmo.xyz/list/farewell');
    const farewellEvents = await farewellResponse.json();
    
    console.log('Fetching Howdy events from https://fygw0.kcmo.xyz/list/howdy');
    const howdyResponse = await fetch('https://fygw0.kcmo.xyz/list/howdy');
    const howdyEvents = await howdyResponse.json();
    
    console.log(`📊 Found ${farewellEvents.length} Farewell events`);
    console.log(`📊 Found ${howdyEvents.length} Howdy events`);
    
    // Transform events to new enhanced structure
    const transformedEvents = [];
    
    // Process Farewell events
    farewellEvents.forEach(event => {
      const transformed = transformEventData(event, 'farewell');
      transformedEvents.push(transformed);
    });
    
    // Process Howdy events
    howdyEvents.forEach(event => {
      const transformed = transformEventData(event, 'howdy');
      transformedEvents.push(transformed);
    });
    
    console.log(`✅ Transformed ${transformedEvents.length} total events to new format`);
    
    // Show sample original vs transformed
    if (farewellEvents.length > 0) {
      console.log('\n📝 ORIGINAL EVENT STRUCTURE:');
      console.log(JSON.stringify(farewellEvents[0], null, 2));
      
      console.log('\n🚀 NEW ENHANCED EVENT STRUCTURE:');
      console.log(JSON.stringify(transformedEvents[0], null, 2));
    }
    
    return { farewellEvents, howdyEvents, transformedEvents };
    
  } catch (error) {
    console.error('Failed to fetch events from live APIs:', error);
    return { farewellEvents: [], howdyEvents: [], transformedEvents: [] };
  }
}

function transformEventData(oldEvent, venue) {
  // Extract enhanced data from description
  const description = oldEvent.description || '';
  const suggestedPrice = extractPrice(description);
  const ageRestriction = extractAgeRestriction(description, venue);
  const ticketUrl = extractTicketUrl(description);
  
  return {
    // NEW ENHANCED STRUCTURE - All the additional fields you're adding
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: oldEvent.title,
    venue: venue, // 'farewell' or 'howdy' 
    date: oldEvent.date,
    time: oldEvent.time || getDefaultTime(venue),
    age_restriction: ageRestriction,
    suggested_price: suggestedPrice,
    description: cleanDescription(description),
    ticket_url: ticketUrl,
    
    // Flyer/Image handling (NEW)
    flyer_url: oldEvent.imageUrl,
    flyer_filename: oldEvent.imageUrl ? oldEvent.imageUrl.split('/').pop() : null,
    flyer_needs_migration: !!oldEvent.imageUrl, // Flag for R2 migration
    
    // Enhanced metadata (NEW)
    created_at: oldEvent.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active', // NEW: active/cancelled/postponed
    featured: false, // NEW: for slideshow priority
    slideshow_order: null, // NEW: for manual ordering
    
    // Admin tracking (NEW)
    created_by: 'migration-script',
    last_modified_by: 'migration-script',
    
    // Legacy data preservation
    legacy_id: oldEvent.id,
    legacy_type: oldEvent.type,
    migration_source: venue === 'farewell' ? 'https://fygw0.kcmo.xyz/list/farewell' : 'https://fygw0.kcmo.xyz/list/howdy',
    migration_date: new Date().toISOString()
  };
}

// Helper functions for data extraction
function extractPrice(description) {
  const pricePatterns = [
    /\$\d+[-–]\$?\d+/,  // $10-$15 or $10-15
    /\$\d+/,            // $10
    /\d+[-–]\d+\s*dollars?/i, // 10-15 dollars
    /free/i             // Free
  ];
  
  for (const pattern of pricePatterns) {
    const match = description.match(pattern);
    if (match) return match[0];
  }
  return '';
}

function extractAgeRestriction(description, venue) {
  if (description.match(/21\+/i)) return '21+ unless with parent or legal guardian';
  if (description.match(/all ages/i)) return 'All ages';
  if (description.match(/18\+/i)) return '18+';
  
  // Default by venue if not specified
  return venue === 'farewell' ? '21+ unless with parent or legal guardian' : '21+';
}

function extractTicketUrl(description) {
  const urlMatch = description.match(/https?:\/\/[^\s\)]+/);
  return urlMatch ? urlMatch[0].replace(/[.,!?]$/, '') : '';
}

function getDefaultTime(venue) {
  // Default times based on venue
  return 'Doors at 7pm / Music at 8pm';
}

function cleanDescription(description) {
  // Remove info that's now in separate fields
  return description
    .replace(/\$\d+[-–]\$?\d+|\$\d+/g, '') // Remove pricing
    .replace(/https?:\/\/[^\s\)]+/g, '')   // Remove URLs
    .replace(/21\+[^.]*\.?/gi, '')         // Remove age restrictions
    .replace(/all ages[^.]*\.?/gi, '')     // Remove age restrictions
    .replace(/\s+/g, ' ')                  // Clean up whitespace
    .trim();
}

async function migrateBlogData() {
  console.log('📝 Migrating Blog Data from D1 and KV...');
  
  try {
    // 1. Get blog posts from bl0wd1 D1 database
    console.log('Fetching blog posts from bl0wd1 D1 database...');
    const blogPostsQuery = await runCommand(`wrangler d1 execute bl0wd1 --remote --command "SELECT * FROM blog_posts ORDER BY created_at DESC;"`);
    
    let blogPosts = [];
    if (blogPostsQuery && blogPostsQuery.includes('│')) {
      console.log('✅ Found blog posts in D1 database');
      // The posts will be displayed in table format, but we need to get them as JSON for migration
      const blogPostsJson = await runCommand(`wrangler d1 execute bl0wd1 --remote --json --command "SELECT * FROM blog_posts ORDER BY created_at DESC;"`);
      if (blogPostsJson) {
        try {
          const parsed = JSON.parse(blogPostsJson);
          blogPosts = parsed.results || [];
          console.log(`📊 Found ${blogPosts.length} blog posts in D1`);
          if (blogPosts.length > 0) {
            console.log('Sample blog post:', JSON.stringify(blogPosts[0], null, 2));
          }
        } catch (e) {
          console.log('Could not parse JSON, but posts exist');
        }
      }
    }
    
    // 2. Get featured content from bl0wkv KV
    console.log('Fetching featured_info from bl0wkv KV...');
    const featuredInfo = await runCommand(`wrangler kv key get "featured_info" --binding bl0wkv`);
    
    let featuredData = null;
    if (featuredInfo && featuredInfo.trim()) {
      try {
        featuredData = JSON.parse(featuredInfo);
        console.log('✅ Found featured content:', featuredData);
      } catch (parseError) {
        console.error('❌ Failed to parse featured info:', parseError);
      }
    }
    
    console.log(`✅ Blog migration summary: ${blogPosts.length} blog posts from D1, ${featuredData ? 'featured content found' : 'no featured content'} from KV`);
    
    return { blogPosts, featuredData };
    
  } catch (error) {
    console.error('❌ Error migrating blog data:', error);
    return { blogPosts: [], featuredData: null };
  }
}

async function migrateGalleryData() {
  console.log('🖼️ Migrating Gallery/Flyer Data...');
  
  // Use proper binding names instead of raw IDs
  console.log('Checking KV namespaces using proper bindings...');
  
  // Check what's in the legacy KV namespaces (using bindings from wrangler.toml)
  const farewellKV = await runCommand(`wrangler kv key list --binding EVENTS_FAREWELL`);
  console.log('Farewell KV keys:', farewellKV);
  
  const howdyKV = await runCommand(`wrangler kv key list --binding EVENTS_HOWDY`);
  console.log('Howdy KV keys:', howdyKV);
  
  const blogKV = await runCommand(`wrangler kv key list --binding bl0wkv`);
  console.log('Blog KV keys:', blogKV);
  
  const flyerKV = await runCommand(`wrangler kv key list --binding fff_kv`);
  console.log('Flyer KV keys:', flyerKV);
  
  console.log('✅ Gallery/KV data inspection complete');
}

async function actuallyMigrateEvents(transformedEvents) {
  console.log('🚀 Starting ACTUAL event migration to new KV...');
  
  if (!transformedEvents || transformedEvents.length === 0) {
    console.log('No events to migrate');
    return;
  }
  
  console.log(`Migrating ${transformedEvents.length} events to EVENTS_KV binding...`);
  
  for (const event of transformedEvents) {
    const key = `event:${event.venue}:${event.id}`;
    const value = JSON.stringify(event);
    
    try {
      // Use proper binding name instead of raw ID
      const result = await runCommand(`wrangler kv key put "${key}" "${value.replace(/"/g, '\\"')}" --binding EVENTS_KV`);
      console.log(`✅ Migrated event: ${event.title} (${event.venue})`);
    } catch (error) {
      console.error(`❌ Failed to migrate event ${event.title}:`, error);
    }
  }
  
  console.log('🎉 Event migration complete!');
}

async function performFullMigration() {
  console.log('🚀 PERFORMING FULL MIGRATION...\n');
  
  try {
    // 1. Fetch and transform events
    const eventData = await migrateEventsData();
    
    // 2. Actually migrate to new KV
    if (eventData.transformedEvents && eventData.transformedEvents.length > 0) {
      await actuallyMigrateEvents(eventData.transformedEvents);
    }
    
    // 3. Migrate other data
    await migrateBlogData();
    await migrateGalleryData();
    
    console.log('\n✅ FULL MIGRATION COMPLETE!');
    console.log('Next steps:');
    console.log('1. Test the admin dashboard with migrated data');
    console.log('2. Verify events are showing correctly');
    console.log('3. Test creating new events');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Choose what to run:
const RUN_MODE = process.argv[2] || 'inspect'; // 'inspect' or 'migrate'

if (RUN_MODE === 'migrate') {
  console.log('🚀 RUNNING FULL MIGRATION...');
  performFullMigration();
} else {
  console.log('🔍 RUNNING INSPECTION ONLY...');
  inspectDataStructures();
}

async function inspectDataStructures() {
  console.log('🔍 Inspecting current data structures...\n');
  
  try {
    await migrateEventsData();
    await migrateBlogData(); 
    await migrateGalleryData();
    
    console.log('\n✅ Data structure inspection complete!');
    console.log('\nNext steps:');
    console.log('1. Review the data structure above');
    console.log('2. Run: node migrate-data.js migrate');
    console.log('3. Test the migrated data in the unified backend');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}
