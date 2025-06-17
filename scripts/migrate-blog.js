#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📝 Migrating Blog Posts to Unified Backend...\n');

async function migrateBlogPosts() {
  try {
    // Get blog posts metadata first (without full content to avoid buffer issues)
    const result = execSync(`wrangler d1 execute bl0wd1 --remote --json --command "SELECT id, title, SUBSTR(content, 1, 200) as content_preview, image_url, created_at FROM blog_posts ORDER BY created_at DESC;"`, {
      encoding: 'utf8',
      cwd: __dirname,
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    const parsed = JSON.parse(result);
    const posts = parsed[0].results || [];
    
    console.log(`📊 Found ${posts.length} blog posts to migrate`);
    
    // Migrate each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const kvKey = `blog_post_${post.id}`;
      const kvValue = {
        id: post.id,
        title: post.title,
        content_preview: post.content_preview,
        image_url: post.image_url,
        created_at: post.created_at,
        migrated_at: new Date().toISOString(),
        source: 'bl0wd1',
        published: true,
        needs_full_content: true // Flag to indicate full content needs to be fetched separately
      };
      
      // Write to temp file
      const tempFile = `/tmp/blog_${post.id}.json`;
      fs.writeFileSync(tempFile, JSON.stringify(kvValue));
      
      // Put in KV
      execSync(`wrangler kv key put "${kvKey}" --path "${tempFile}" --binding BLOG_KV`, {
        cwd: __dirname
      });
      
      // Clean up
      fs.unlinkSync(tempFile);
      
      console.log(`✅ Migrated post ${i + 1}/${posts.length}: ${post.title}`);
    }
    
    // Create blog index
    const blogIndex = posts.map(post => ({
      id: post.id,
      title: post.title,
      created_at: post.created_at,
      published: true,
      image_url: post.image_url
    }));
    
    const indexFile = '/tmp/blog_index.json';
    fs.writeFileSync(indexFile, JSON.stringify(blogIndex));
    
    execSync(`wrangler kv key put "blog_index" --path "${indexFile}" --binding BLOG_KV`, {
      cwd: __dirname
    });
    
    fs.unlinkSync(indexFile);
    
    console.log('\n✅ Blog posts migration complete!');
    console.log(`✅ Migrated ${posts.length} blog posts and created index`);
    
  } catch (error) {
    console.error('❌ Blog migration failed:', error.message);
  }
}

migrateBlogPosts();
