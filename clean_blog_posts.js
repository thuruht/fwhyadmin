const fs = require('fs');

// Read the extracted blog posts
const blogPosts = JSON.parse(fs.readFileSync('blog_posts_extracted.json', 'utf8'));

// Map of blog post IDs to their corresponding R2 image URLs
const imageMap = {
  13: 'https://fwhy-bimg.farewellcafe.com/community-garden-poster.jpeg',
  14: 'https://fwhy-bimg.farewellcafe.com/pizza-pizza.jpeg', 
  15: 'https://fwhy-bimg.farewellcafe.com/tshirts-4sale.jpeg',
  16: 'https://fwhy-bimg.farewellcafe.com/howdy-thrift.jpg'
};

console.log('Processing', blogPosts.length, 'blog posts...');

// Update blog posts with proper image URLs
const updatedPosts = blogPosts.map(post => {
  let content = post.content;
  
  // Clean up the content - remove the extra metadata that got included
  content = content.replace(/(',NULL,'[\d\-\sT:.Z]+)$/, '');
  
  // Replace [IMAGE_REMOVED] with the actual R2 URL if available
  if (imageMap[post.id]) {
    content = content.replace('<img src="[IMAGE_REMOVED]">', `<img src="${imageMap[post.id]}" alt="${post.title}">`);
  }
  
  const cleanPost = {
    id: post.id,
    title: post.title,
    content: content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log(`Processed post ${post.id}: ${post.title}`);
  return cleanPost;
});

// Save the updated posts
fs.writeFileSync('blog_posts_for_kv.json', JSON.stringify(updatedPosts, null, 2));
console.log('✅ Saved updated blog posts to blog_posts_for_kv.json');

// Also create individual files for easy KV upload
updatedPosts.forEach(post => {
  const filename = `blog_post_${post.id}.json`;
  fs.writeFileSync(filename, JSON.stringify(post, null, 2));
  console.log(`✅ Created ${filename}`);
});
