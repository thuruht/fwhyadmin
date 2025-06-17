// Clean up mailchimp tracker links in blog posts
const blogPosts = [
  { id: 9, kvKey: 'blog:9' },
  { id: 13, kvKey: 'blog:13' },
  { id: 14, kvKey: 'blog:14' },
  { id: 15, kvKey: 'blog:15' },
  { id: 16, kvKey: 'blog:16' }
];

// Function to clean mailchimp URLs
function cleanMailchimpUrls(content) {
  // Match mailchimp URLs and extract the actual URL
  const mailchimpPattern = /https:\/\/us21\.mailchimp\.com\/mctx\/clicks\?url=([^&]+)&[^"]+/g;
  
  return content.replace(mailchimpPattern, (match, encodedUrl) => {
    try {
      // Decode the URL
      return decodeURIComponent(encodedUrl);
    } catch (e) {
      console.warn('Failed to decode URL:', encodedUrl);
      return match; // Return original if decode fails
    }
  });
}

console.log('Mailchimp URL cleaning patterns:');
console.log('Before: https://us21.mailchimp.com/mctx/clicks?url=https%3A%2F%2Fwww.example.com&xid=...');
console.log('After:  https://www.example.com');
console.log();

// Test the pattern
const testContent = 'Check out <a href="https://us21.mailchimp.com/mctx/clicks?url=https%3A%2F%2Fwww.kcur.org%2Farts-life%2F2025-01-26%2Fpizza-kansas-city&xid=4bf541fdd5&uid=185460042">here</a>';
console.log('Test:');
console.log('Before:', testContent);
console.log('After: ', cleanMailchimpUrls(testContent));
console.log();

// Generate wrangler commands to update each post
blogPosts.forEach(post => {
  console.log(`# Update blog post ${post.id}`);
  console.log(`wrangler kv key get "${post.kvKey}" --binding BLOG_KV --remote > temp_post_${post.id}.json`);
  console.log(`# Edit temp_post_${post.id}.json to clean links, then:`);
  console.log(`wrangler kv key put "${post.kvKey}" "$(cat temp_post_${post.id}.json)" --binding BLOG_KV --remote`);
  console.log();
});
