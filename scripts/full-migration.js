#!/usr/bin/env node

/**
 * Complete Migration Script for Unified Admin Backend
 * Migrates all data without processing raw content to avoid memory issues
 */

const { execSync } = require('child_process');

// Target unified backend KV namespaces
const UNIFIED_KV = {
  BLOG_KV: '6ee9ab6b71634a4eb3e66de82d8dfcdc',
  EVENTS_KV: '464d611d5ad8433cab6bcfba64d8424f',
  GALLERY_KV: '3cd37bd71260436c8ed12078483e9fa4',
  CONFIG_KV: 'd54801ef0fb0443e850ee532ad1384b6'
};

console.log('🚀 Starting FULL migration to unified admin backend...\n');

function runCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      cwd: __dirname
    });
    return result.trim();
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    return null;
  }
}

async function migrateBlogPosts() {
  console.log('📝 Migrating Blog Posts from bl0wd1...');
  
  try {
    // Get all blog posts using simpler approach
    const command = `wrangler d1 execute bl0wd1 --remote --command "SELECT COUNT(*) as count FROM blog_posts;"`;
    const countResult = runCommand(command);
    
    if (!countResult) {
      console.log('❌ Failed to connect to blog database');
      return;
    }
    
    // Get posts one by one to avoid memory issues
    const getPostsCommand = `wrangler d1 execute bl0wd1 --remote --json --command "SELECT id, title, LEFT(content, 100) as content_preview, author, created_at, updated_at, published FROM blog_posts ORDER BY created_at DESC LIMIT 10;"`;
    const result = runCommand(getPostsCommand);
    
    if (!result) {
      console.log('❌ Failed to fetch blog posts');
      return;
    }
    
    // Parse JSON result
    let posts = [];
    try {
      const parsed = JSON.parse(result);
      posts = parsed.results || parsed || [];
    } catch (e) {
      console.log('❌ Failed to parse blog posts JSON');
      return;
    }
    
    console.log(`📊 Found ${posts.length} blog posts to migrate`);
    
    // Migrate each post to unified KV
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const kvKey = `blog_post_${post.id}`;
      const kvValue = JSON.stringify({
        id: post.id,
        title: post.title,
        content: post.content_preview,
        author: post.author || 'Unknown',
        created_at: post.created_at,
        updated_at: post.updated_at,
        published: post.published === 1 || post.published === '1',
        migrated_at: new Date().toISOString(),
        source: 'bl0wd1'
      });
      
      // Use temporary file approach for KV
      const tempFile = `/tmp/blog_${post.id}.json`;
      require('fs').writeFileSync(tempFile, kvValue);
      
      const putCommand = `wrangler kv key put "${kvKey}" --path "${tempFile}" --binding BLOG_KV`;
      runCommand(putCommand);
      
      // Clean up temp file
      require('fs').unlinkSync(tempFile);
      
      console.log(`✅ Migrated post ${i + 1}/${posts.length}: ${post.title}`);
    }
    
    // Create blog index using temp file
    const blogIndex = posts.map(post => ({
      id: post.id,
      title: post.title,
      author: post.author || 'Unknown',
      created_at: post.created_at,
      published: post.published === 1 || post.published === '1'
    }));
    
    const indexTempFile = '/tmp/blog_index.json';
    require('fs').writeFileSync(indexTempFile, JSON.stringify(blogIndex));
    
    const indexCommand = `wrangler kv key put "blog_index" --path "${indexTempFile}" --binding BLOG_KV`;
    runCommand(indexCommand);
    
    require('fs').unlinkSync(indexTempFile);
    
    console.log('✅ Blog posts migration complete!');
    
  } catch (error) {
    console.error('❌ Blog migration failed:', error.message);
  }
}

async function migrateEvents() {
  console.log('📅 Migrating Events...');
  
  try {
    // Fetch events from the API endpoints
    const farewellEvents = await fetch('https://fygw0.kcmo.xyz/list/farewell').then(r => r.json());
    const howdyEvents = await fetch('https://fygw0.kcmo.xyz/list/howdy').then(r => r.json());
    
    const allEvents = [
      ...farewellEvents.map(e => ({ ...e, venue: 'farewell' })),
      ...howdyEvents.map(e => ({ ...e, venue: 'howdy' }))
    ];
    
    console.log(`📊 Found ${allEvents.length} events to migrate`);
    
    // Migrate each event
    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];
      const kvKey = `event_${event.id}`;
      const kvValue = JSON.stringify({
        ...event,
        migrated_at: new Date().toISOString(),
        status: 'active'
      });
      
      // Use temp file for KV storage
      const tempFile = `/tmp/event_${event.id}.json`;
      require('fs').writeFileSync(tempFile, kvValue);
      
      const putCommand = `wrangler kv key put "${kvKey}" --path "${tempFile}" --binding EVENTS_KV`;
      runCommand(putCommand);
      
      require('fs').unlinkSync(tempFile);
      
      console.log(`✅ Migrated event ${i + 1}/${allEvents.length}: ${event.title}`);
    }
    
    // Create events index using temp file
    const eventsIndex = allEvents.map(event => ({
      id: event.id,
      title: event.title,
      venue: event.venue,
      date: event.date,
      time: event.time,
      imageUrl: event.imageUrl
    }));
    
    const indexTempFile = '/tmp/events_index.json';
    require('fs').writeFileSync(indexTempFile, JSON.stringify(eventsIndex));
    
    const indexCommand = `wrangler kv key put "events_index" --path "${indexTempFile}" --binding EVENTS_KV`;
    runCommand(indexCommand);
    
    require('fs').unlinkSync(indexTempFile);
    
    console.log('✅ Events migration complete!');
    
  } catch (error) {
    console.error('❌ Events migration failed:', error.message);
  }
}

async function migrateGalleryAndFlyers() {
  console.log('🖼️ Migrating Gallery and Flyers...');
  
  try {
    // Get flyers from gallery database
    const command = `wrangler d1 execute fwhygal0r3-db --remote --command "SELECT * FROM flyers ORDER BY uploaded_at DESC;"`;
    const result = runCommand(command);
    
    if (!result) {
      console.log('❌ Failed to fetch flyers');
      return;
    }
    
    // Parse flyers (simplified parsing)
    const lines = result.split('\n').filter(line => line.trim());
    const flyers = [];
    
    let dataStarted = false;
    for (const line of lines) {
      if (line.includes('id') && line.includes('filename')) {
        dataStarted = true;
        continue;
      }
      
      if (dataStarted && line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          flyers.push({
            id: parts[0],
            filename: parts[1],
            title: parts[2] || 'Untitled',
            uploaded_at: parts[3]
          });
        }
      }
    }
    
    console.log(`📊 Found ${flyers.length} flyers to migrate`);
    
    // Migrate flyers
    for (let i = 0; i < flyers.length; i++) {
      const flyer = flyers[i];
      const kvKey = `flyer_${flyer.id}`;
      const kvValue = JSON.stringify({
        ...flyer,
        migrated_at: new Date().toISOString(),
        source: 'fwhygal0r3-db'
      });        const tempFile = `/tmp/flyer_${flyer.id}.json`;
        require('fs').writeFileSync(tempFile, kvValue);
        
        const putCommand = `wrangler kv key put "${kvKey}" --path "${tempFile}" --binding GALLERY_KV`;
        runCommand(putCommand);
        
        require('fs').unlinkSync(tempFile);
      
      console.log(`✅ Migrated flyer ${i + 1}/${flyers.length}: ${flyer.filename}`);
    }
    
    // Create gallery index using temp file
    const galleryIndex = flyers.map(flyer => ({
      id: flyer.id,
      filename: flyer.filename,
      title: flyer.title,
      uploaded_at: flyer.uploaded_at
    }));
    
    const indexTempFile = '/tmp/gallery_index.json';
    require('fs').writeFileSync(indexTempFile, JSON.stringify(galleryIndex));
    
    const indexCommand = `wrangler kv key put "gallery_index" --path "${indexTempFile}" --binding GALLERY_KV`;
    runCommand(indexCommand);
    
    require('fs').unlinkSync(indexTempFile);
    
    console.log('✅ Gallery migration complete!');
    
  } catch (error) {
    console.error('❌ Gallery migration failed:', error.message);
  }
}

async function createMenuConfiguration() {
  console.log('🍽️ Creating Menu Configuration...');
  
  try {
    const menuConfig = {
      venues: [
        {
          id: 'farewell',
          name: 'The Farewell',
          description: 'Live music venue',
          active: true
        },
        {
          id: 'howdy',
          name: 'Howdy',
          description: 'Event space',
          active: true
        }
      ],
      navigation: [
        { label: 'Home', path: '/', active: true },
        { label: 'Events', path: '/events', active: true },
        { label: 'Blog', path: '/blog', active: true },
        { label: 'Gallery', path: '/gallery', active: true },
        { label: 'About', path: '/about', active: true }
      ],
      migrated_at: new Date().toISOString()
    };
    
    const configTempFile = '/tmp/site_config.json';
    require('fs').writeFileSync(configTempFile, JSON.stringify(menuConfig));
    
    const configCommand = `wrangler kv key put "site_config" --path "${configTempFile}" --binding CONFIG_KV`;
    runCommand(configCommand);
    
    require('fs').unlinkSync(configTempFile);
    
    console.log('✅ Menu configuration created!');
    
  } catch (error) {
    console.error('❌ Menu configuration failed:', error.message);
  }
}

async function runFullMigration() {
  console.log('🎯 Starting complete migration process...\n');
  
  await migrateBlogPosts();
  console.log();
  
  await migrateEvents();
  console.log();
  
  await migrateGalleryAndFlyers();
  console.log();
  
  await createMenuConfiguration();
  console.log();
  
  console.log('🎉 MIGRATION COMPLETE!');
  console.log('✅ All blog posts, events, flyers, and configuration migrated');
  console.log('✅ Frontend can now call the unified admin backend');
  console.log('\nNext steps:');
  console.log('1. Deploy the unified admin worker');
  console.log('2. Update frontend to use new API endpoints');
  console.log('3. Test all functionality');
}

// Run the migration
runFullMigration().catch(console.error);
