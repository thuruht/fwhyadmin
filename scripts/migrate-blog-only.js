#!/usr/bin/env node

/**
 * Blog-Only Migration Script
 * 
 * This script migrates ONLY blog posts from the bl0wd1 D1 database
 * to the unified admin backend, avoiding processing of large image data
 * that was causing the previous script to fail.
 */

const { execSync } = require('child_process');

// Target database and KV namespace
const SOURCE_DB = 'bl0wd1';  // The database containing blog posts
const TARGET_KV = '6ee9ab6b71634a4eb3e66de82d8dfcbc';  // BLOG_KV in unified backend

console.log('📝 Starting blog-only migration from bl0wd1...\n');

async function runCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      cwd: __dirname
    });
    return result;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return null;
  }
}

async function migrateBlogPosts() {
  console.log('🔍 Fetching blog posts from bl0wd1 database...');
  
  try {
    // Get all blog posts from the blog_posts table
    const command = `wrangler d1 execute ${SOURCE_DB} --remote --json --command "SELECT id, title, content, author, created_at, updated_at, published, tags, excerpt FROM blog_posts ORDER BY created_at DESC;"`;
    
    const result = await runCommand(command);
    
    if (!result) {
      console.error('❌ Failed to fetch blog posts');
      return;
    }
    
    const data = JSON.parse(result);
    const posts = data.results || [];
    
    console.log(`✅ Found ${posts.length} blog posts`);
    
    if (posts.length === 0) {
      console.log('ℹ️ No blog posts to migrate');
      return;
    }
    
    // Migrate each post to the unified backend KV
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`📄 Migrating post ${i + 1}/${posts.length}: "${post.title || 'Untitled'}"`);
      
      try {
        // Create a clean post object for the unified backend
        const cleanPost = {
          id: post.id,
          title: post.title || '',
          content: post.content || '',
          author: post.author || 'Unknown',
          created_at: post.created_at,
          updated_at: post.updated_at,
          published: post.published || false,
          tags: post.tags || '',
          excerpt: post.excerpt || '',
          source: 'bl0wd1',
          migrated_at: new Date().toISOString()
        };
        
        // Store in unified backend KV
        const kvKey = `blog:${post.id}`;
        const kvValue = JSON.stringify(cleanPost);
        
        // Use wrangler to put the data in KV
        const kvCommand = `wrangler kv key put --namespace-id ${TARGET_KV} "${kvKey}" "${kvValue.replace(/"/g, '\\"')}"`;
        
        const kvResult = await runCommand(kvCommand);
        
        if (kvResult !== null) {
          successCount++;
          console.log(`  ✅ Migrated post ID ${post.id}`);
        } else {
          errorCount++;
          console.log(`  ❌ Failed to migrate post ID ${post.id}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error migrating post ID ${post.id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successfully migrated: ${successCount} posts`);
    console.log(`  ❌ Failed to migrate: ${errorCount} posts`);
    console.log(`  📝 Total processed: ${posts.length} posts`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run the migration
migrateBlogPosts()
  .then(() => {
    console.log('\n🎉 Blog migration completed!');
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
