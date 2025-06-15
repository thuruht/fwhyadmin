// src/utils/cors.ts
import { Env } from '../types/env';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export function handleCORS(response?: Response): Response {
  if (!response) {
    // Return preflight response
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Add CORS headers to existing response
  const newHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export function getAllowedOrigins(env: Env): string[] {
  if (env.ENVIRONMENT === 'production') {
    return [
      'https://farewellcafe.com',
      'https://www.farewellcafe.com',
      'https://admin.farewellcafe.com'
    ];
  } else {
    return [
      'http://localhost:8787',
      'http://localhost:3000',
      'https://dev.farewellcafe.com'
    ];
  }
}
