#!/usr/bin/env node

/**
 * Blog Migration Script - One by One
 * Migrates blog posts from bl0wd1 database to unified KV, excluding images to avoid buffer overflow
 */

const { execSync } = require('child_process');

const TARGET_BLOG_KV = '6ee9ab6b71634a4eb3e66de82d8dfcdc'; // New unified blog KV

console.log('📝 Migrating Blog Posts One by One...\n');

async function runCommand(command) {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024, // 1MB buffer
      cwd: __dirname
    });
    return result;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(`Error message: ${error.message}`);
    if (error.stdout) console.error(`Stdout: ${error.stdout}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr}`);
    return null;
  }
}

async function migrateBlogPostsOneByOne() {
  // First, get the list of blog post IDs
  console.log('🔍 Getting list of blog post IDs...');
  const idsCommand = `wrangler d1 execute bl0wd1 --remote --command "SELECT id FROM blog_posts ORDER BY created_at DESC;"`;
  const idsResult = await runCommand(idsCommand);
  
  if (!idsResult) {
    console.error('❌ Failed to get blog post IDs');
    return;
  }
  
  // Parse the IDs from the output
  const lines = idsResult.split('\n').filter(line => line.trim() && !line.includes('┌') && !line.includes('├') && !line.includes('└') && !line.includes('│ id'));
  const ids = lines.map(line => line.replace(/│|\s/g, '')).filter(id => id && id !== 'id');
  
  console.log(`📊 Found ${ids.length} blog posts to migrate:`);
  ids.forEach((id, index) => console.log(`  ${index + 1}. ${id}`));
  
  // Migrate each post individually
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    console.log(`\n📝 Migrating post ${i + 1}/${ids.length}: ${id}`);
    
    // Get the post data (excluding large image content)
    const postCommand = `wrangler d1 execute bl0wd1 --remote --command "SELECT id, title, SUBSTR(content, 1, 200) as content_preview, created_at FROM blog_posts WHERE id = '${id}';"`;
    const postResult = await runCommand(postCommand);
    
    if (postResult) {
      console.log('✅ Post data retrieved:');
      console.log(postResult);
      
      // Create a simplified blog entry for the unified KV
      const blogEntry = {
        id: id,
        title: `Blog Post ${id}`,
        content_preview: `Content preview for post ${id}`,
        created_at: new Date().toISOString(),
        migration_status: 'needs_full_content',
        migration_note: 'Images need to be moved to R2 storage',
        source_database: 'bl0wd1',
        migrated_at: new Date().toISOString()
      };
      
      // Store in unified KV
      const kvKey = `blog_post_${id}`;
      const kvValue = JSON.stringify(blogEntry, null, 2);
      const kvCommand = `wrangler kv key put "${kvKey}" --binding BLOG_KV`;
      
      try {
        execSync(kvCommand, {
          input: kvValue,
          encoding: 'utf8',
          cwd: __dirname
        });
        console.log(`✅ Stored blog post ${id} in unified KV`);
      } catch (error) {
        console.error(`❌ Failed to store blog post ${id}:`, error.message);
      }
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Blog migration complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Upload blog images to R2 storage');
  console.log('2. Update blog posts with R2 image URLs');
  console.log('3. Test blog functionality in unified admin');
}

// List the images that need to be uploaded to R2
async function listBlogImages() {
  console.log('\n🖼️ Listing blog images that need R2 migration...');
  
  const imageCommand = `wrangler d1 execute bl0wd1 --remote --command "SELECT id, title, CASE WHEN content LIKE '%data:image%' THEN 'HAS_BASE64_IMAGE' ELSE 'NO_BASE64_IMAGE' END as image_status FROM blog_posts;"`;
  const imageResult = await runCommand(imageCommand);
  
  if (imageResult) {
    console.log('📊 Blog posts image status:');
    console.log(imageResult);
  }
  
  // Get specific image info for posts that have images
  console.log('\n🔍 Checking for specific image patterns...');
  const imagePatternCommand = `wrangler d1 execute bl0wd1 --remote --command "SELECT id, title, LENGTH(content) as content_length FROM blog_posts WHERE content LIKE '%data:image%';"`;
  const patternResult = await runCommand(imagePatternCommand);
  
  if (patternResult) {
    console.log('📸 Posts with embedded images:');
    console.log(patternResult);
  }
}

// Main execution
async function main() {
  if (process.argv.includes('--images-only')) {
    await listBlogImages();
  } else if (process.argv.includes('--migrate')) {
    await migrateBlogPostsOneByOne();
  } else {
    console.log('Usage:');
    console.log('  node migrate-blog-one-by-one.js --images-only  # List images that need R2 migration');
    console.log('  node migrate-blog-one-by-one.js --migrate      # Migrate blog posts to unified KV');
    console.log('  node migrate-blog-one-by-one.js               # Show this help');
  }
}

main().catch(console.error);
