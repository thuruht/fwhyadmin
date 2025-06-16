const fs = require('fs');

// Read the SQL file
const sqlContent = fs.readFileSync('blog_export.sql', 'utf8');

// Extract INSERT statements for blog_posts
const insertLines = sqlContent.split('\n').filter(line => 
    line.startsWith('INSERT INTO blog_posts VALUES')
);

console.log('Found', insertLines.length, 'blog posts');

const blogPosts = [];

insertLines.forEach(line => {
    // Extract the VALUES part
    const valuesMatch = line.match(/INSERT INTO blog_posts VALUES\((.+)\);?$/);
    if (valuesMatch) {
        const valuesStr = valuesMatch[1];
        
        // Parse the values - this is tricky because of nested quotes and commas
        // We'll extract ID, title, and content carefully
        
        // Find the first comma (after ID)
        const firstComma = valuesStr.indexOf(',');
        const id = valuesStr.substring(0, firstComma);
        
        // Find the title (between quotes after first comma)
        const afterId = valuesStr.substring(firstComma + 1);
        const titleMatch = afterId.match(/^'([^']*)',/);
        
        if (titleMatch) {
            const title = titleMatch[1];
            const afterTitle = afterId.substring(titleMatch[0].length);
            
            // The rest is content (remove quotes and handle escaped quotes)
            let content = afterTitle;
            if (content.startsWith("'") && content.endsWith("'")) {
                content = content.slice(1, -1);
            }
            
            // Remove base64 images from content
            content = content.replace(/<img[^>]*src="data:image\/[^"]*"[^>]*>/g, '<img src="[IMAGE_REMOVED]">');
            
            // Replace escaped quotes
            content = content.replace(/''/g, "'");
            
            blogPosts.push({
                id: parseInt(id),
                title: title,
                content: content
            });
        }
    }
});

// Output the extracted blog posts
console.log('\n=== EXTRACTED BLOG POSTS ===\n');

blogPosts.forEach(post => {
    console.log(`ID: ${post.id}`);
    console.log(`Title: ${post.title}`);
    console.log(`Content: ${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}`);
    console.log('-'.repeat(50));
});

// Save to JSON file for easier use
fs.writeFileSync('blog_posts_extracted.json', JSON.stringify(blogPosts, null, 2));
console.log('\nBlog posts saved to blog_posts_extracted.json');
