// src/handlers/blog.ts
import { Env, BlogPost, ApiResponse } from '../types/env';

export async function handleBlog(request: Request, env: Env, mode: 'public' | 'admin'): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  if (mode === 'public') {
    // Handle public blog endpoints
    if (method === 'GET' && url.pathname.endsWith('/posts')) {
      return await getPublicPosts(env);
    }

    if (method === 'GET' && url.pathname.endsWith('/featured')) {
      return await getFeaturedContent(env);
    }
  }

  if (mode === 'admin') {
    // Handle admin blog endpoints
    if (method === 'GET' && url.pathname.endsWith('/posts')) {
      return await getAdminPosts(env);
    }

    if (method === 'POST' && url.pathname.endsWith('/posts')) {
      return await createBlogPost(request, env);
    }

    if (method === 'PUT' && url.pathname.match(/\/posts\/\d+$/)) {
      const postId = url.pathname.split('/').pop();
      return await updateBlogPost(request, env, postId!);
    }

    if (method === 'DELETE' && url.pathname.match(/\/posts\/\d+$/)) {
      const postId = url.pathname.split('/').pop();
      return await deleteBlogPost(env, postId!);
    }

    if (method === 'GET' && url.pathname.endsWith('/featured')) {
      return await getAdminFeatured(env);
    }

    if (method === 'PUT' && url.pathname.endsWith('/featured')) {
      return await updateFeatured(request, env);
    }

    if (method === 'POST' && url.pathname.endsWith('/upload-image')) {
      return await uploadBlogImage(request, env);
    }
  }

  return Response.json({
    success: false,
    error: 'Blog endpoint not found'
  } satisfies ApiResponse, { status: 404 });
}

async function getPublicPosts(env: Env): Promise<Response> {
  try {
    // List all blog keys from KV
    const { keys } = await env.BLOG_KV.list({ prefix: 'blog:' });
    
    // Fetch all blog posts
    const posts = await Promise.all(
      keys.map(async (key) => {
        const postJson = await env.BLOG_KV.get(key.name);
        return postJson ? JSON.parse(postJson) : null;
      })
    );

    // Filter out null posts and sort by ID (newest first)
    const validPosts = posts
      .filter(post => post !== null)
      .sort((a, b) => b.id - a.id);

    return Response.json({
      success: true,
      data: validPosts
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch blog posts'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function getFeaturedContent(env: Env): Promise<Response> {
  try {
    // Get featured content from KV
    const featuredJson = await env.BLOG_KV.get('post_featured_info');
    
    if (!featuredJson) {
      return Response.json({
        success: true,
        data: { 
          text: 'Welcome to Farewell Cafe!', 
          videos: [
            {
              id: 1,
              title: 'Welcome to Farewell',
              youtubeUrl: '',
              thumbnailUrl: '',
              description: 'Experience the vibe'
            }
          ]
        }
      } satisfies ApiResponse);
    }

    const featured = JSON.parse(featuredJson);
    
    // Ensure backwards compatibility with old format
    if (featured.youtubeUrl && !featured.videos) {
      featured.videos = [{
        id: 1,
        title: 'Featured Video',
        youtubeUrl: featured.youtubeUrl,
        thumbnailUrl: '',
        description: ''
      }];
      delete featured.youtubeUrl;
    }
    
    return Response.json({
      success: true,
      data: featured
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching featured content:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch featured content'
    } satisfies ApiResponse, { status: 500 });
  }
}

// Admin handlers
async function getAdminPosts(env: Env): Promise<Response> {
  try {
    // List all blog keys from KV
    const { keys } = await env.BLOG_KV.list({ prefix: 'blog:' });
    
    // Fetch all blog posts with metadata
    const posts = await Promise.all(
      keys.map(async (key) => {
        const postJson = await env.BLOG_KV.get(key.name);
        return postJson ? { ...JSON.parse(postJson), key: key.name } : null;
      })
    );

    // Filter out null posts and sort by ID (newest first)
    const validPosts = posts
      .filter((post): post is BlogPost & { key: string } => post !== null)
      .sort((a, b) => b.id - a.id);

    return Response.json({
      success: true,
      data: validPosts
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching admin blog posts:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch blog posts'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function createBlogPost(request: Request, env: Env): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let postData: Omit<BlogPost, 'id' | 'created_at'>;
    let imageFile: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle form data with potential image upload
      const formData = await request.formData();
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;
      imageFile = formData.get('image') as File | null;
      
      if (!title || !content) {
        return Response.json({
          success: false,
          error: 'Title and content are required'
        } satisfies ApiResponse, { status: 400 });
      }
      
      postData = { title, content };
    } else {
      // Handle JSON data
      postData = await request.json() as Omit<BlogPost, 'id' | 'created_at'>;
    }
    
    // Generate new ID (get highest current ID + 1)
    const { keys } = await env.BLOG_KV.list({ prefix: 'blog:' });
    const existingIds = keys.map(key => {
      const parts = key.name.split(':');
      return parts.length > 1 ? parseInt(parts[1]) : 0;
    }).filter(id => !isNaN(id));
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    
    let finalContent = postData.content;
    
    // If image is provided, upload to R2 and replace placeholder
    if (imageFile && imageFile.size > 0) {
      const timestamp = Date.now();
      const extension = imageFile.name.split('.').pop();
      const filename = `blog_${newId}_${timestamp}.${extension}`;
      
      // Upload to R2
      await env.BLOG_IMAGES_R2.put(filename, imageFile.stream(), {
        httpMetadata: {
          contentType: imageFile.type,
        },
      });
      
      // Replace image placeholder with R2 URL or prepend image
      const baseUrl = env.R2_PUBLIC_URL_PREFIX || 'https://fwhy-bimg.farewellcafe.com';
      const imageUrl = `${baseUrl}/${filename}`;
      
      if (finalContent.includes('[IMAGE_PLACEHOLDER]')) {
        finalContent = finalContent.replace('[IMAGE_PLACEHOLDER]', `<img src="${imageUrl}" alt="${postData.title}">`);
      } else {
        // Prepend image to content if no placeholder found
        finalContent = `<p><img src="${imageUrl}" alt="${postData.title}"></p>\n${finalContent}`;
      }
    }
    
    const newPost: BlogPost = {
      id: newId,
      title: postData.title,
      content: finalContent,
      created_at: new Date().toISOString()
    };

    // Store in KV
    await env.BLOG_KV.put(`blog:${newId}`, JSON.stringify(newPost));

    return Response.json({
      success: true,
      data: newPost
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error creating blog post:', error);
    return Response.json({
      success: false,
      error: 'Failed to create blog post'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function updateBlogPost(request: Request, env: Env, postId: string): Promise<Response> {
  try {
    const postData = await request.json() as Partial<BlogPost>;
    
    // Get existing post
    const existingPostJson = await env.BLOG_KV.get(`blog:${postId}`);
    if (!existingPostJson) {
      return Response.json({
        success: false,
        error: 'Blog post not found'
      } satisfies ApiResponse, { status: 404 });
    }

    const existingPost = JSON.parse(existingPostJson) as BlogPost;
    
    // Update post
    const updatedPost: BlogPost = {
      ...existingPost,
      ...postData,
      id: parseInt(postId), // Ensure ID doesn't change
      updated_at: new Date().toISOString()
    };

    // Store updated post
    await env.BLOG_KV.put(`blog:${postId}`, JSON.stringify(updatedPost));

    return Response.json({
      success: true,
      data: updatedPost
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error updating blog post:', error);
    return Response.json({
      success: false,
      error: 'Failed to update blog post'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function deleteBlogPost(env: Env, postId: string): Promise<Response> {
  try {
    // Check if post exists
    const existingPost = await env.BLOG_KV.get(`blog:${postId}`);
    if (!existingPost) {
      return Response.json({
        success: false,
        error: 'Blog post not found'
      } satisfies ApiResponse, { status: 404 });
    }

    // Delete post
    await env.BLOG_KV.delete(`blog:${postId}`);

    return Response.json({
      success: true,
      data: { message: 'Blog post deleted successfully' }
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error deleting blog post:', error);
    return Response.json({
      success: false,
      error: 'Failed to delete blog post'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function getAdminFeatured(env: Env): Promise<Response> {
  try {
    const featuredJson = await env.BLOG_KV.get('post_featured_info');
    
    const featured = featuredJson ? JSON.parse(featuredJson) : {
      text: 'Welcome to Farewell Cafe!',
      videos: [
        {
          id: 1,
          title: 'Welcome Video',
          youtubeUrl: '',
          thumbnailUrl: '',
          description: 'Add your featured video here'
        }
      ]
    };

    // Ensure backwards compatibility
    if (featured.youtubeUrl && !featured.videos) {
      featured.videos = [{
        id: 1,
        title: 'Featured Video',
        youtubeUrl: featured.youtubeUrl,
        thumbnailUrl: '',
        description: ''
      }];
      delete featured.youtubeUrl;
    }

    return Response.json({
      success: true,
      data: featured
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error fetching admin featured content:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch featured content'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function updateFeatured(request: Request, env: Env): Promise<Response> {
  try {
    const featuredData = await request.json();
    
    // Validate video carousel structure
    if (featuredData.videos && Array.isArray(featuredData.videos)) {
      featuredData.videos = featuredData.videos.map((video: any, index: number) => ({
        id: video.id || index + 1,
        title: video.title || `Video ${index + 1}`,
        youtubeUrl: video.youtubeUrl || '',
        thumbnailUrl: video.thumbnailUrl || '',
        description: video.description || ''
      }));
    }
    
    // Store featured content
    await env.BLOG_KV.put('post_featured_info', JSON.stringify(featuredData));

    return Response.json({
      success: true,
      data: featuredData
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error updating featured content:', error);
    return Response.json({
      success: false,
      error: 'Failed to update featured content'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function uploadBlogImage(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file || typeof file === 'string') {
      return Response.json({
        success: false,
        error: 'No valid image file provided'
      } satisfies ApiResponse, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `blog_${timestamp}.${extension}`;

    // Upload to R2 - check if R2 binding exists
    if (!env.BLOG_IMAGES_R2) {
      return Response.json({
        success: false,
        error: 'R2 storage not configured'
      } satisfies ApiResponse, { status: 500 });
    }

    await env.BLOG_IMAGES_R2.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Return the public URL
    const baseUrl = env.R2_PUBLIC_URL_PREFIX || 'https://fwhy-bimg.farewellcafe.com';
    const imageUrl = `${baseUrl}/${filename}`;

    return Response.json({
      success: true,
      data: { url: imageUrl, filename }
    } satisfies ApiResponse);

  } catch (error) {
    console.error('Error uploading blog image:', error);
    return Response.json({
      success: false,
      error: 'Failed to upload image'
    } satisfies ApiResponse, { status: 500 });
  }
}
