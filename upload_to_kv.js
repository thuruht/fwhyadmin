const fs = require('fs');

// Read the extracted blog posts
const blogPosts = JSON.parse(fs.readFileSync('blog_posts_extracted.json', 'utf8'));

// Map blog post titles to image filenames
const imageMap = {
  'KCMA - COMMUNITY GARDEN WORKDAY WEDNESDAYS': 'community_garden_poster.jpeg',
  'Now Open: Northeast Pizza': 'pizza_pizza.jpeg', 
  'Farewell and Howdy t-shirts for sale!': 'tshirts_4sale.jpeg',
  'Have you visited Howdy DIY Thrift yet?': 'HOWDYTHRIFT.jpg'
};

const R2_BASE_URL = 'https://fwhy-bimg.farewellcafe.com';

// Update blog posts with proper R2 URLs
const updatedPosts = blogPosts.map(post => {
  let content = post.content;
  
  // Clean up the content - remove the extra metadata at the end
  content = content.split("',NULL,'")[0];
  
  // Replace [IMAGE_REMOVED] with proper R2 URL if we have a matching image
  const imageFile = imageMap[post.title];
  if (imageFile) {
    const imageUrl = `${R2_BASE_URL}/${imageFile}`;
    content = content.replace('[IMAGE_REMOVED]', imageUrl);
  }
  
  return {
    id: post.id,
    title: post.title,
    content: content,
    created_at: new Date().toISOString() // Add timestamp
  };
});

console.log('Updated blog posts:');
updatedPosts.forEach(post => {
  console.log(`\nID: ${post.id}`);
  console.log(`Title: ${post.title}`);
  console.log(`Content: ${post.content.substring(0, 150)}...`);
});

// Save updated posts
fs.writeFileSync('blog_posts_updated.json', JSON.stringify(updatedPosts, null, 2));
console.log('\nUpdated blog posts saved to blog_posts_updated.json');

// Create wrangler commands to upload to KV
console.log('\n=== WRANGLER KV UPLOAD COMMANDS ===');
updatedPosts.forEach(post => {
  const kvKey = `blog:${post.id}`;
  const kvValue = JSON.stringify(post);
  console.log(`wrangler kv:key put "${kvKey}" '${kvValue}' --binding BLOG_KV --remote`);
});
