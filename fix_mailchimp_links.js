const fs = require('fs');
const { execSync } = require('child_process');

// Function to clean mailchimp URLs
function cleanMailchimpUrls(content) {
  const mailchimpPattern = /https:\/\/us21\.mailchimp\.com\/mctx\/clicks\?url=([^&]+)&[^"]+/g;
  
  return content.replace(mailchimpPattern, (match, encodedUrl) => {
    try {
      return decodeURIComponent(encodedUrl);
    } catch (e) {
      console.warn('Failed to decode URL:', encodedUrl);
      return match;
    }
  });
}

// Blog posts to update
const blogPosts = [
  { id: 14, kvKey: 'blog:14' }, // Pizza post with mailchimp links
  { id: 16, kvKey: 'blog:16' }  // Thrift shop post with mailchimp links
];

console.log('Cleaning mailchimp tracker links from blog posts...\n');

blogPosts.forEach(post => {
  try {
    console.log(`Processing blog post ${post.id}...`);
    
    // Get the current post
    const currentPost = execSync(`wrangler kv key get "${post.kvKey}" --binding BLOG_KV --remote`, { encoding: 'utf8' });
    const postData = JSON.parse(currentPost);
    
    console.log(`Original content length: ${postData.content.length}`);
    
    // Clean the content
    const cleanedContent = cleanMailchimpUrls(postData.content);
    postData.content = cleanedContent;
    
    console.log(`Cleaned content length: ${postData.content.length}`);
    
    // Write back to KV
    const updatedPostJson = JSON.stringify(postData);
    fs.writeFileSync(`temp_post_${post.id}.json`, updatedPostJson);
    
    execSync(`wrangler kv key put "${post.kvKey}" '${updatedPostJson.replace(/'/g, "\\'")}' --binding BLOG_KV --remote`);
    
    console.log(`✅ Updated blog post ${post.id}\n`);
    
  } catch (error) {
    console.error(`❌ Failed to update blog post ${post.id}:`, error.message);
  }
});

console.log('Done cleaning mailchimp links!');
