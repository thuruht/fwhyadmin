// src/handlers/migration.ts
import { Env, ApiResponse, BlogPost } from '../types/env';
import { v4 as uuidv4 } from 'uuid'; // For generating new IDs if needed

// Helper to generate a slug from a title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export async function handleBlogImageMigration(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed. Use POST to start migration.' } satisfies ApiResponse, { status: 405 });
  }

  try {
    const { BLOG_IMAGES_R2, BLOG_KV, UNIFIED_DB, R2_PUBLIC_URL_PREFIX } = env;

    if (!R2_PUBLIC_URL_PREFIX || !R2_PUBLIC_URL_PREFIX.startsWith('https://')) {
        return Response.json({ success: false, error: 'R2_PUBLIC_URL_PREFIX is not configured correctly in environment variables.' } satisfies ApiResponse, { status: 500 });
    }

    const listResponse = await BLOG_KV.list({ prefix: 'blog:' });
    const migratedPostsInfo: any[] = [];
    const errors: string[] = [];

    for (const key of listResponse.keys) {
      const postJson = await BLOG_KV.get(key.name);
      if (!postJson) {
        errors.push(`Failed to retrieve post: ${key.name}`);
        continue;
      }

      let originalPostData: any; // Use any for flexible parsing of old structure
      try {
        originalPostData = JSON.parse(postJson);
      } catch (e) {
        errors.push(`Failed to parse JSON for post: ${key.name}. Error: ${(e as Error).message}`);
        continue;
      }

      let newImageUrl = originalPostData.imageUrl || originalPostData.image_url; // Handle both possible old field names
      let imageMigratedOrConfirmed = false;

      // TODO: Clarify source of images. If they are local paths and need uploading, this logic needs to change.
      // This current logic assumes we are checking if an image (referenced by a filename or partial path)
      // already exists in R2, and then constructing its full public URL.
      if (newImageUrl && !newImageUrl.startsWith('https://')) {
        const imageFileName = newImageUrl.split('/').pop(); // Extract filename

        if (imageFileName) {
          const r2ObjectKey = `blog/${imageFileName}`; // Assumes images are/will be in a 'blog/' prefix in R2
          try {
            // Check if image exists in R2. 
            // For actual migration of local files, this would be an R2_BUCKET.put() operation.
            const r2Object = await BLOG_IMAGES_R2.head(r2ObjectKey);

            if (r2Object) { // head returns metadata if object exists, null otherwise
              const cleanR2PublicUrl = R2_PUBLIC_URL_PREFIX.endsWith('/') ? R2_PUBLIC_URL_PREFIX.slice(0, -1) : R2_PUBLIC_URL_PREFIX;
              const cleanR2ObjectKey = r2ObjectKey.startsWith('/') ? r2ObjectKey.slice(1) : r2ObjectKey;
              newImageUrl = `${cleanR2PublicUrl}/${cleanR2ObjectKey}`;
              imageMigratedOrConfirmed = true;
            } else {
              // If image is not in R2, and we are supposed to upload it, this is where the upload logic would go.
              // For now, we record an error if it's expected to be there.
              errors.push(`Image "${imageFileName}" for post "${originalPostData.title}" not found in R2 at key "${r2ObjectKey}". Keeping old URL: ${originalPostData.imageUrl || originalPostData.image_url}`);
            }
          } catch (e) {
            errors.push(`Error accessing R2 for image "${imageFileName}" for post "${originalPostData.title}": ${(e as Error).message}`);
          }
        }
      } else if (newImageUrl && newImageUrl.startsWith('https://')) {
        imageMigratedOrConfirmed = true; // Already a full URL, assume it's correct or already migrated
      }
      
      const slug = originalPostData.slug || generateSlug(originalPostData.title);
      const postId = originalPostData.id || uuidv4();

      // Prepare the BlogPost object for D1 insertion
      const blogPostForDb: BlogPost = {
        id: postId,
        title: originalPostData.title || 'Untitled Post',
        content: originalPostData.content || '',
        // author_id: originalPostData.author_id, // Uncomment and map if available
        status: originalPostData.published === 1 || originalPostData.status === 'published' ? 'published' : 'draft', // Adapt status mapping
        published_at: originalPostData.published_at || (originalPostData.published === 1 ? new Date().toISOString() : undefined),
        created_at: originalPostData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // tags: originalPostData.tags, // Uncomment and map if available
        // category: originalPostData.category, // Uncomment and map if available
        imageUrl: newImageUrl, // This will be the R2 public URL or the old URL if migration failed
        slug: slug,
      };

      try {
        // Insert into D1
        const stmt = UNIFIED_DB.prepare(
          'INSERT INTO blog_posts (id, title, content, status, published_at, created_at, updated_at, imageUrl, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          blogPostForDb.id,
          blogPostForDb.title,
          blogPostForDb.content,
          blogPostForDb.status,
          blogPostForDb.published_at,
          blogPostForDb.created_at,
          blogPostForDb.updated_at,
          blogPostForDb.imageUrl,
          blogPostForDb.slug
        );
        await stmt.run();

        // Optionally, delete from KV after successful D1 insertion
        // await BLOG_KV.delete(key.name);

        migratedPostsInfo.push({
          id: postId,
          title: originalPostData.title,
          old_image_url: originalPostData.imageUrl || originalPostData.image_url,
          new_image_url: newImageUrl,
          slug: slug,
          d1_insertion: 'Success',
          image_migrated_status: imageMigratedOrConfirmed ? 'Success/Confirmed' : ( (originalPostData.imageUrl || originalPostData.image_url) && !(originalPostData.imageUrl || originalPostData.image_url).startsWith('https://') ? 'Failed (Not in R2 or error)' : 'No Action (No image or already R2 URL)'),
        });

      } catch (d1Error) {
        errors.push(`Failed to insert post "${originalPostData.title}" (ID: ${postId}) into D1. Error: ${(d1Error as Error).message}`);
        migratedPostsInfo.push({
          id: postId,
          title: originalPostData.title,
          d1_insertion: 'Failed',
          error: (d1Error as Error).message,
        });
      }
    }

    if (errors.length > 0) {
      return Response.json({
        success: true, // Partial success
        message: 'Blog migration to D1 completed with some errors. Check data for details.',
        data: { migratedPosts: migratedPostsInfo, errors },
      } satisfies ApiResponse, { status: 207 }); // 207 Multi-Status
    }

    return Response.json({
      success: true,
      message: 'Blog posts migrated to D1 successfully. Image URLs updated/confirmed.',
      data: { migratedPosts: migratedPostsInfo },
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Migration failed:', error);
    return Response.json({
      success: false,
      error: `Migration failed: ${(error as Error).message}`
    } satisfies ApiResponse, { status: 500 });
  }
}

// Main migration handler - can be expanded for other migration tasks
export async function handleMigration(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  // Route to specific migration handlers based on path
  // Ensure your worker routes POST /admin/migrate/blog (or similar) to this handler
  if (url.pathname.endsWith('/blog-posts') || url.pathname.endsWith('/blog-images-meta')) { 
    return handleBlogImageMigration(request, env);
  }
  
  return Response.json({
    success: false,
    error: 'Specific migration task not found. Use /<base>/blog-posts for blog migration to D1.'
  } satisfies ApiResponse, { status: 404 });
}
