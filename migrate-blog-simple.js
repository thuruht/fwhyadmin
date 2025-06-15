#!/usr/bin/env node

const { execSync } = require('child_process');

async function runCommand(command) {
  try {
    const result = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    return result;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

async function migrateBlogPosts() {
  console.log('📝 Migrating blog posts without images...');
  
  // Get post count first
  const countResult = await runCommand('wrangler d1 execute bl0wd1 --remote --command "SELECT COUNT(*) as count FROM blog_posts;"');
  console.log('Post count result:', countResult);
  
  // Get posts one by one
  for (let i = 0; i < 5; i++) {
    console.log(`\n📄 Migrating post ${i + 1}/5...`);
    
    const postResult = await runCommand(`wrangler d1 execute bl0wd1 --remote --command "SELECT id, title, SUBSTR(content, 1, 100) as content_preview, created_at FROM blog_posts LIMIT 1 OFFSET ${i};"`);
    
    if (postResult) {
      console.log(`Post ${i + 1} preview:`, postResult);
      
      // Get full post metadata (without content to avoid buffer issues)
      const metadataResult = await runCommand(`wrangler d1 execute bl0wd1 --remote --json --command "SELECT id, title, created_at, CASE WHEN content LIKE '%data:image%' THEN 'HAS_EMBEDDED_IMAGE' ELSE 'NO_EMBEDDED_IMAGE' END as image_status FROM blog_posts LIMIT 1 OFFSET ${i};"`);
      
      if (metadataResult) {
        try {
          const parsed = JSON.parse(metadataResult);
          const post = parsed.results[0];
          
          // Create unified blog post structure
          const unifiedPost = {
            id: `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: post.title,
            content: "Content to be migrated from D1", // Placeholder
            author: "admin",
            status: "published",
            featured: false,
            tags: [],
            created_at: post.created_at,
            updated_at: new Date().toISOString(),
            legacy_id: post.id,
            image_status: post.image_status,
            migration_date: new Date().toISOString()
          };
          
          // Store in unified KV
          await runCommand(`wrangler kv key put "blog:${unifiedPost.id}" '${JSON.stringify(unifiedPost)}' --binding 6ee9ab6b71634a4eb3e66de82d8dfcdc`);
          
          console.log(`✅ Migrated post: ${post.title}`);
          
        } catch (e) {
          console.error(`Failed to parse post ${i + 1}:`, e.message);
        }
      }
    }
  }
  
  console.log('\n✅ Blog post migration complete!');
}

migrateBlogPosts();
