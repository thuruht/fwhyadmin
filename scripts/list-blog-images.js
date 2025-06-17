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

async function listBlogImages() {
  console.log('📋 Listing blog posts and their image requirements...\n');
  
  const posts = [
    { id: 9, title: "Howdy!" },
    { id: 13, title: "KCMA - COMMUNITY GARDEN WORKDAY WEDNESDAYS" },
    { id: 14, title: "Now Open: Northeast Pizza" },
    { id: 15, title: "Farewell and Howdy t-shirts for sale!" },
    { id: 16, title: "Have you visited Howdy DIY Thrift yet?" }
  ];
  
  console.log('🖼️  BLOG IMAGES NEEDED FOR R2 MIGRATION:');
  console.log('=====================================\n');
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`📄 POST ${i + 1}: "${post.title}"`);
    console.log(`   ID: ${post.id}`);
    
    // Check if post has embedded images
    const hasImageResult = await runCommand(`wrangler d1 execute bl0wd1 --remote --command "SELECT CASE WHEN content LIKE '%data:image%' THEN 'YES' ELSE 'NO' END as has_image FROM blog_posts WHERE id = ${post.id};"`);
    
    if (hasImageResult && hasImageResult.includes('YES')) {
      console.log(`   🖼️  HAS EMBEDDED IMAGE - needs R2 migration`);
      console.log(`   📁 Suggested R2 path: blog-images/post-${post.id}-image.jpg`);
    } else {
      console.log(`   ✅ No embedded images`);
    }
    console.log('');
  }
  
  console.log('📋 MIGRATION PLAN:');
  console.log('1. Extract base64 images from each blog post');
  console.log('2. Upload to R2 bucket as: blog-images/post-{id}-image.jpg');
  console.log('3. Replace base64 data with R2 URLs in blog content');
  console.log('4. Migrate cleaned blog posts to unified KV store');
}

listBlogImages();
