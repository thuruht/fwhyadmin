/**
 * Blog Handler
 * Manages newsletter posts and blog functionality
 */

export async function handleBlog(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    switch (action) {
      case 'public':
        return await getPublicPosts(request, env);
      case 'list':
        return await listPosts(request, env);
      case 'create':
        return await createPost(request, env);
      case 'update':
        return await updatePost(request, env);
      case 'delete':
        return await deletePost(request, env);
      case 'publish':
        return await publishPost(request, env);
      case 'featured':
        return await manageFeatured(request, env);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Blog handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Blog operation failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getPublicPosts(request, env) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  const offset = parseInt(url.searchParams.get('offset')) || 0;
  const type = url.searchParams.get('type') || 'all'; // 'posts', 'featured', 'all'

  try {
    const postsData = await env.BLOG_KV.get('blog:posts');
    const featuredData = await env.BLOG_KV.get('blog:featured');

    let posts = [];
    let featured = null;

    if (postsData) {
      const allPosts = JSON.parse(postsData);
      // Only return published posts for public API
      posts = allPosts.filter(post => post.status === 'published');
      
      // Sort by publish date (newest first)
      posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      
      // Apply pagination
      posts = posts.slice(offset, offset + limit);
    }

    if (featuredData && (type === 'featured' || type === 'all')) {
      const featuredPost = JSON.parse(featuredData);
      if (featuredPost.status === 'published') {
        featured = featuredPost;
      }
    }

    const response = {
      posts: type === 'featured' ? [] : posts,
      featured: type === 'posts' ? null : featured,
      total: posts.length,
      offset,
      limit
    };

    return new Response(
      JSON.stringify(response), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get public posts error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch posts' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function listPosts(request, env) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const offset = parseInt(url.searchParams.get('offset')) || 0;
  const status = url.searchParams.get('status'); // 'draft', 'published', 'archived'

  try {
    const postsData = await env.BLOG_KV.get('blog:posts');
    
    if (!postsData) {
      return new Response(
        JSON.stringify({ posts: [], total: 0 }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    let posts = JSON.parse(postsData);
    
    // Filter by status if specified
    if (status) {
      posts = posts.filter(post => post.status === status);
    }

    // Sort by created date (newest first)
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedPosts = posts.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        posts: paginatedPosts,
        total: posts.length,
        offset,
        limit
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('List posts error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list posts' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function createPost(request, env) {
  try {
    const postData = await request.json();
    const { title, content, excerpt, status } = postData;

    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: 'Title and content required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const post = {
      id: crypto.randomUUID(),
      title,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      status: status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? new Date().toISOString() : null
    };

    // Get existing posts
    const existingData = await env.BLOG_KV.get('blog:posts');
    const posts = existingData ? JSON.parse(existingData) : [];
    
    posts.push(post);
    
    await env.BLOG_KV.put('blog:posts', JSON.stringify(posts));

    return new Response(
      JSON.stringify({ 
        success: true, 
        post,
        message: 'Post created successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create post error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function updatePost(request, env) {
  try {
    const postData = await request.json();
    const { id, title, content, excerpt, status } = postData;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Post ID required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingData = await env.BLOG_KV.get('blog:posts');
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: 'Posts not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const posts = JSON.parse(existingData);
    const postIndex = posts.findIndex(post => post.id === id);
    
    if (postIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Post not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update post
    const existingPost = posts[postIndex];
    posts[postIndex] = {
      ...existingPost,
      title: title || existingPost.title,
      content: content || existingPost.content,
      excerpt: excerpt || existingPost.excerpt,
      status: status || existingPost.status,
      updatedAt: new Date().toISOString(),
      publishedAt: (status === 'published' && !existingPost.publishedAt) 
        ? new Date().toISOString() 
        : existingPost.publishedAt
    };
    
    await env.BLOG_KV.put('blog:posts', JSON.stringify(posts));

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: posts[postIndex],
        message: 'Post updated successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update post error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function deletePost(request, env) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'Post ID required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingData = await env.BLOG_KV.get('blog:posts');
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: 'Posts not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const posts = JSON.parse(existingData);
    const filteredPosts = posts.filter(post => post.id !== postId);
    
    if (filteredPosts.length === posts.length) {
      return new Response(
        JSON.stringify({ error: 'Post not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await env.BLOG_KV.put('blog:posts', JSON.stringify(filteredPosts));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Post deleted successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete post error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function publishPost(request, env) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'Post ID required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingData = await env.BLOG_KV.get('blog:posts');
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: 'Posts not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const posts = JSON.parse(existingData);
    const postIndex = posts.findIndex(post => post.id === postId);
    
    if (postIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Post not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Publish post
    posts[postIndex].status = 'published';
    posts[postIndex].publishedAt = new Date().toISOString();
    posts[postIndex].updatedAt = new Date().toISOString();
    
    await env.BLOG_KV.put('blog:posts', JSON.stringify(posts));

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: posts[postIndex],
        message: 'Post published successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Publish post error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to publish post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function manageFeatured(request, env) {
  const method = request.method;

  try {
    if (method === 'GET') {
      const featuredData = await env.BLOG_KV.get('blog:featured');
      const featured = featuredData ? JSON.parse(featuredData) : null;

      return new Response(
        JSON.stringify({ featured }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST') {
      const { postId } = await request.json();

      if (!postId) {
        return new Response(
          JSON.stringify({ error: 'Post ID required' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get the post to feature
      const postsData = await env.BLOG_KV.get('blog:posts');
      if (!postsData) {
        return new Response(
          JSON.stringify({ error: 'Posts not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const posts = JSON.parse(postsData);
      const post = posts.find(p => p.id === postId);

      if (!post) {
        return new Response(
          JSON.stringify({ error: 'Post not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Set as featured
      await env.BLOG_KV.put('blog:featured', JSON.stringify(post));

      return new Response(
        JSON.stringify({ 
          success: true, 
          featured: post,
          message: 'Post set as featured' 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'DELETE') {
      await env.BLOG_KV.delete('blog:featured');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Featured post removed' 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Manage featured error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to manage featured post' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
