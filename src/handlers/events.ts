// src/handlers/events.ts
import { Env, Event, ApiResponse } from '../types/env';

export async function handleEvents(request: Request, env: Env, mode: 'list' | 'slideshow' | 'admin'): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  try {
    switch (mode) {
      case 'list':
        return handleEventsList(request, env);
      case 'slideshow':
        return handleEventsSlideshow(request, env);
      case 'admin':
        return handleEventsAdmin(request, env);
      default:
        return Response.json({
          success: false,
          error: 'Invalid events mode'
        } satisfies ApiResponse, { status: 400 });
    }
  } catch (error) {
    console.error('Events handler error:', error);
    return Response.json({
      success: false,
      error: 'Events operation failed'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function handleEventsList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') as 'farewell' | 'howdy' | 'other' | null;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const thumbnails = url.searchParams.get('thumbnails') === 'true';
  const pastEvents = url.searchParams.get('past') === 'true';
  
  try {
    // Get events from KV store
    const eventsPrefix = pastEvents ? 'past-events:' : 'events:';
    const eventsListKey = 'events-list';
    
    let events: Event[] = [];
    
    // Try to get the events list from KV
    const eventsList = await env.EVENTS_KV.get(eventsListKey, 'json') as string[] || [];
    
    // Fetch events in parallel
    const eventPromises = eventsList.map(eventId => 
      env.EVENTS_KV.get(`${eventsPrefix}${eventId}`, 'json')
    );
    
    const eventResults = await Promise.all(eventPromises);
    events = eventResults.filter(Boolean) as Event[];
    
    // Filter by venue if specified
    if (venue) {
      if (venue === 'other') {
        // 'other' includes events marked as 'other' or those that have multiple venues
        events = events.filter(event => 
          event.venue === 'other' || 
          (Array.isArray(event.venue) && event.venue.length > 1)
        );
      } else {
        events = events.filter(event => 
          event.venue === venue || 
          (Array.isArray(event.venue) && event.venue.includes(venue))
        );
      }
    }
    
    // Apply date filtering for past events
    const now = new Date();
    if (pastEvents) {
      events = events.filter(event => new Date(event.date) < now);
    } else {
      events = events.filter(event => new Date(event.date) >= now);
    }
    
    // Sort by date (ascending for upcoming, descending for past)
    events.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return pastEvents ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
    
    // Apply limit
    if (limit > 0) {
      events = events.slice(0, limit);
    }
    
    // Add thumbnail_url if requested
    if (thumbnails) {
      events = events.map(event => ({
        ...event,
        thumbnail_url: event.flyerThumbnail || event.flyer_url || event.flyerUrl || event.imageUrl
      }));
    }
    
    return Response.json({
      success: true,
      data: {
        events,
        total: events.length,
        venue: venue || 'all',
        limit,
        thumbnails
      }
    } satisfies ApiResponse);
  } catch (error) {
    console.error('Error getting events:', error);
    return Response.json({
      success: false,
      error: 'Failed to retrieve events'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function handleEventsSlideshow(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') as 'farewell' | 'howdy' | 'other' | null;
  
  try {
    // First get all events using our list function
    const eventsRequest = new Request(`${url.origin}/api/events/list?venue=${venue || 'all'}&thumbnails=true`);
    const listResponse = await handleEventsList(eventsRequest, env);
    const listData = await listResponse.json();
    
    if (!listData.success) {
      return Response.json({
        success: false,
        error: 'Failed to retrieve events for slideshow'
      } satisfies ApiResponse, { status: 500 });
    }
    
    const events = listData.data.events || [];
    
    // Transform events to slideshow format and handle custom order
    let slideshowItems = events.map(event => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
      venue_display: event.venue_display || event.venue,
      thumbnail_url: event.thumbnail_url || event.flyerThumbnail || event.flyer_url || event.imageUrl,
      image_url: event.flyer_url || event.flyerUrl || event.imageUrl,
      order: event.order || 0
    }));
    
    // Sort by custom order first (if specified), then by date
    slideshowItems.sort((a, b) => {
      // First sort by order if defined (and not 0)
      if (a.order && b.order) {
        if (a.order !== b.order) {
          return a.order - b.order;
        }
      } else if (a.order && a.order > 0) {
        return -1; // a has order, b doesn't or is 0
      } else if (b.order && b.order > 0) {
        return 1;  // b has order, a doesn't or is 0
      }
      
      // Then sort by date (closest upcoming first)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    return Response.json({
      success: true,
      data: {
        slideshow: slideshowItems,
        venue: venue || 'all'
      }
    } satisfies ApiResponse);
  } catch (error) {
    console.error('Error generating slideshow:', error);
    return Response.json({
      success: false,
      error: 'Failed to generate slideshow'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function handleEventsAdmin(request: Request, env: Env): Promise<Response> {
  const method = request.method;

  switch (method) {
    case 'GET':
      return handleEventsList(request, env);
    case 'POST':
      return createEvent(request, env);
    case 'PUT':
      return updateEvent(request, env);
    case 'DELETE':
      return deleteEvent(request, env);
    default:
      return Response.json({
        success: false,
        error: 'Method not allowed'
      } satisfies ApiResponse, { status: 405 });
  }
}

async function createEvent(request: Request, env: Env): Promise<Response> {
  // TODO: Implement event creation
  return Response.json({
    success: false,
    error: 'Event creation not yet implemented'
  } satisfies ApiResponse, { status: 501 });
}

async function updateEvent(request: Request, env: Env): Promise<Response> {
  // TODO: Implement event update
  return Response.json({
    success: false,
    error: 'Event update not yet implemented'
  } satisfies ApiResponse, { status: 501 });
}

async function deleteEvent(request: Request, env: Env): Promise<Response> {
  // TODO: Implement event deletion
  return Response.json({
    success: false,
    error: 'Event deletion not yet implemented'
  } satisfies ApiResponse, { status: 501 });
}
