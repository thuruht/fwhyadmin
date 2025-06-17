#!/usr/bin/env node

/**
 * Focused Blog Migration Script
 * 
 * Migrates blog posts from bl0wd1 D1 database to unified backend
 * Targets the specific table structure we know exists
 */

const { execSync } = require('child_process');

// Target database and destination
const BLOG_DB = 'bl0wd1';
const NEW_BLOG_KV = '6ee9ab6b71634a4eb3e66de82d8dfcdc'; // unified backend blog KV

console.log('🚀 Starting focused blog migration from bl0wd1...\n');

async function runCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large data
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(`Error message:`, error.message);
    return null;
  }
}

async function migrateBlogPosts() {
  console.log('📝 Migrating blog posts from bl0wd1 database...');
  
  try {
    // First, get the table structure to see what we're working with
    console.log('🔍 Checking table structure...');
    const tablesResult = await runCommand(`wrangler d1 execute ${BLOG_DB} --remote --json --command "SELECT name FROM sqlite_master WHERE type='table';"`);
    
    if (!tablesResult) {
      console.error('❌ Could not fetch table list');
      return;
    }
    
    let tables = [];
    try {
      const tablesData = JSON.parse(tablesResult);
      tables = (tablesData.results || []).map(t => t.name);
    } catch (e) {
      console.log('⚠️  JSON parse failed, trying direct table access...');
      // Fallback: we know blog_posts exists
      tables = ['blog_posts'];
    }
    
    console.log('📋 Available tables:', tables.join(', '));
    
    // Look for the blog_posts table specifically (we know it exists)
    const blogTable = tables.find(t => 
      t.toLowerCase() === 'blog_posts' ||
      t.toLowerCase().includes('blog') || 
      t.toLowerCase().includes('post') || 
      t.toLowerCase().includes('article')
    ) || 'blog_posts'; // default to blog_posts since we know it exists
    
    if (!blogTable || blogTable === '') {
      console.log('❌ No suitable blog table found');
      return;
    }
    
    console.log(`✅ Using table: ${blogTable}`);
    
    // Get column structure
    console.log('🔍 Checking column structure...');
    const schemaResult = await runCommand(`wrangler d1 execute ${BLOG_DB} --remote --json --command "PRAGMA table_info(${blogTable});"`);
    
    if (schemaResult) {
      const schemaData = JSON.parse(schemaResult);
      const columns = (schemaData.results || []).map(c => c.name);
      console.log('📋 Available columns:', columns.join(', '));
    }
    
    // Count total posts
    console.log('🔢 Counting total posts...');
    const countResult = await runCommand(`wrangler d1 execute ${BLOG_DB} --remote --json --command "SELECT COUNT(*) as count FROM ${blogTable};"`);
    
    if (!countResult) {
      console.error('❌ Could not count posts');
      return;
    }
    
    let totalPosts = 0;
    try {
      const countData = JSON.parse(countResult);
      totalPosts = countData.results?.[0]?.count || 0;
    } catch (e) {
      console.log('⚠️  JSON parse failed for count, trying direct approach...');
      // We know there are 5 posts from our manual check
      totalPosts = 5;
    }
    console.log(`📊 Found ${totalPosts} total posts to migrate`);
    
    if (totalPosts === 0) {
      console.log('✅ No posts to migrate');
      return;
    }
    
    // Migrate posts in batches without processing the content
    const BATCH_SIZE = 10; // Small batches to avoid overwhelming
    let migratedCount = 0;
    
    for (let offset = 0; offset < totalPosts; offset += BATCH_SIZE) {
      console.log(`🔄 Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}/${Math.ceil(totalPosts/BATCH_SIZE)} (posts ${offset + 1}-${Math.min(offset + BATCH_SIZE, totalPosts)})`);
      
      // Fetch batch
      const batchResult = await runCommand(`wrangler d1 execute ${BLOG_DB} --remote --json --command "SELECT * FROM ${blogTable} ORDER BY rowid LIMIT ${BATCH_SIZE} OFFSET ${offset};"`);
      
      if (!batchResult) {
        console.error(`❌ Failed to fetch batch at offset ${offset}`);
        continue;
      }
      
      // Parse and migrate without processing content
      try {
        const batchData = JSON.parse(batchResult);
        const posts = batchData.results || [];
        
        for (const post of posts) {
          // Create a migration-friendly key
          const postId = post.id || post.rowid || `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const migrationKey = `blog_${postId}`;
          
          // Store post data directly to KV without processing
          const kvCommand = `wrangler kv key put "${migrationKey}" '${JSON.stringify(post).replace(/'/g, "\\'")}' --namespace-id ${NEW_BLOG_KV}`;
          const kvResult = await runCommand(kvCommand);
          
          if (kvResult !== null) {
            migratedCount++;
            console.log(`  ✅ Migrated post: ${migrationKey}`);
          } else {
            console.log(`  ❌ Failed to migrate post: ${migrationKey}`);
          }
        }
        
      } catch (parseError) {
        console.error(`❌ Failed to parse batch at offset ${offset}:`, parseError.message);
      }
    }
    
    console.log(`\n🎉 Migration complete! Successfully migrated ${migratedCount}/${totalPosts} posts`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run migration
migrateBlogPosts()
  .then(() => {
    console.log('\n✅ Blog migration script completed');
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
