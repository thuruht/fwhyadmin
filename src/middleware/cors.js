/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing for the unified admin backend
 */

export function handleCORS(response = null) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be restricted in production
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  if (response) {
    // Add CORS headers to existing response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Return CORS preflight response
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export function getRestrictedCORS(env) {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || [
    'https://farewellcafe.com',
    'https://admin.farewellcafe.com'
  ];

  return function handleRestrictedCORS(request, response = null) {
    const origin = request.headers.get('Origin');
    const isAllowed = allowedOrigins.includes(origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };

    if (response) {
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  };
}
