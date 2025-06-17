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

// Helper function to get all events from KV storage
async function getAllEvents(env: Env): Promise<Event[]> {
  try {
    // List all keys that start with 'event_'
    const listResponse = await env.EVENTS_KV.list({ prefix: 'event_' });
    const events: Event[] = [];
    
    // Fetch each event
    for (const key of listResponse.keys) {
      const eventData = await env.EVENTS_KV.get(key.name);
      if (eventData) {
        try {
          const event = JSON.parse(eventData);
          events.push(event);
        } catch (parseError) {
          console.error(`Error parsing event ${key.name}:`, parseError);
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error fetching events from KV:', error);
    return [];
  }
}

async function handleEventsList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') as 'farewell' | 'howdy' | null;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const thumbnails = url.searchParams.get('thumbnails') === 'true';

  try {
    // Get all events from KV
    let events = await getAllEvents(env);
    
    // Filter by venue if specified
    if (venue && venue !== 'other') {
      events = events.filter(event => event.venue === venue);
    } else if (venue === 'other') {
      events = events.filter(event => event.venue === 'other' || event.venue === 'both');
    }
    
    // Sort by date (soonest first)
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Apply limit
    if (limit > 0) {
      events = events.slice(0, limit);
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
    console.error('Error loading events:', error);
    return Response.json({
      success: true,
      data: {
        events: [],
        total: 0,
        venue: venue || 'all',
        limit,
        thumbnails
      }
    } satisfies ApiResponse);
  }
}

async function handleEventsSlideshow(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') as 'farewell' | 'howdy' | null;

  // TODO: Implement slideshow logic
  return Response.json({
    success: true,
    data: {
      slideshow: [],
      venue: venue || 'all'
    }
  } satisfies ApiResponse);
}

async function handleEventsAdmin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split('/');
  const eventId = pathParts[pathParts.length - 1];

  switch (method) {
    case 'GET':
      if (url.pathname.includes('/list')) {
        return handleEventsList(request, env);
      } else if (eventId && eventId !== 'events') {
        return getEventById(eventId, env);
      } else {
        return handleEventsList(request, env);
      }
    case 'POST':
      return createEvent(request, env);
    case 'PUT':
      if (eventId && eventId !== 'events') {
        return updateEvent(eventId, request, env);
      }
      return Response.json({
        success: false,
        error: 'Event ID required for update'
      } satisfies ApiResponse, { status: 400 });
    case 'DELETE':
      if (eventId && eventId !== 'events') {
        return deleteEvent(eventId, env);
      }
      return Response.json({
        success: false,
        error: 'Event ID required for deletion'
      } satisfies ApiResponse, { status: 400 });
    default:
      return Response.json({
        success: false,
        error: 'Method not allowed'
      } satisfies ApiResponse, { status: 405 });
  }
}

async function getEventById(eventId: string, env: Env): Promise<Response> {
  try {
    const eventData = await env.EVENTS_KV.get(`event_${eventId}`);
    
    if (!eventData) {
      return Response.json({
        success: false,
        error: 'Event not found'
      } satisfies ApiResponse, { status: 404 });
    }
    
    const event = JSON.parse(eventData);
    
    return Response.json({
      success: true,
      data: event
    } satisfies ApiResponse);
  } catch (error) {
    console.error('Error getting event:', error);
    return Response.json({
      success: false,
      error: 'Failed to get event'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function createEvent(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    
    const newEvent: Event = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venue: formData.get('venue') as 'farewell' | 'howdy' | 'other',
      description: formData.get('description') as string || '',
      suggested_price: formData.get('suggestedPrice') as string || '',
      ticket_url: formData.get('ticketLink') as string || '',
      age_restriction: formData.get('ageRestriction') as string || '',
      order: parseInt(formData.get('order') as string || '0'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Handle flyer upload if present
    const flyerFile = formData.get('flyer') as File;
    if (flyerFile && flyerFile.size > 0) {
      // TODO: Upload flyer to R2 and set URLs
      // For now, just use placeholder
      newEvent.flyer_url = '/img/placeholder.png';
      newEvent.thumbnail_url = '/img/placeholder.png';
    }
    
    // Get existing events
    const eventsData = await env.EVENTS_KV.get('events');
    let events: Event[] = [];
    
    if (eventsData) {
      events = JSON.parse(eventsData);
    }
    
    // Add new event
    events.push(newEvent);
    
    // Save back to KV
    await env.EVENTS_KV.put('events', JSON.stringify(events));
    
    return Response.json({
      success: true,
      data: newEvent
    } satisfies ApiResponse);
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({
      success: false,
      error: 'Failed to create event'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function updateEvent(eventId: string, request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    
    // Get existing events
    const eventsData = await env.EVENTS_KV.get('events');
    let events: Event[] = [];
    
    if (eventsData) {
      events = JSON.parse(eventsData);
    }
    
    const eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      return Response.json({
        success: false,
        error: 'Event not found'
      } satisfies ApiResponse, { status: 404 });
    }
    
    // Update event
    const updatedEvent = {
      ...events[eventIndex],
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venue: formData.get('venue') as 'farewell' | 'howdy' | 'other',
      description: formData.get('description') as string || '',
      suggested_price: formData.get('suggestedPrice') as string || '',
      ticket_url: formData.get('ticketLink') as string || '',
      age_restriction: formData.get('ageRestriction') as string || '',
      order: parseInt(formData.get('order') as string || '0'),
      updated_at: new Date().toISOString()
    };
    
    // Handle flyer upload if present
    const flyerFile = formData.get('flyer') as File;
    if (flyerFile && flyerFile.size > 0) {
      // TODO: Upload flyer to R2 and set URLs
      // For now, keep existing or use placeholder
      updatedEvent.flyer_url = updatedEvent.flyer_url || '/img/placeholder.png';
      updatedEvent.thumbnail_url = updatedEvent.thumbnail_url || '/img/placeholder.png';
    }
    
    events[eventIndex] = updatedEvent;
    
    // Save back to KV
    await env.EVENTS_KV.put('events', JSON.stringify(events));
    
    return Response.json({
      success: true,
      data: updatedEvent
    } satisfies ApiResponse);
  } catch (error) {
    console.error('Error updating event:', error);
    return Response.json({
      success: false,
      error: 'Failed to update event'
    } satisfies ApiResponse, { status: 500 });
  }
}

async function deleteEvent(eventId: string, env: Env): Promise<Response> {
  try {
    // Get existing events
    const eventsData = await env.EVENTS_KV.get('events');
    let events: Event[] = [];
    
    if (eventsData) {
      events = JSON.parse(eventsData);
    }
    
    const eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      return Response.json({
        success: false,
        error: 'Event not found'
      } satisfies ApiResponse, { status: 404 });
    }
    
    // Remove event
    events.splice(eventIndex, 1);
    
    // Save back to KV
    await env.EVENTS_KV.put('events', JSON.stringify(events));
    
    return Response.json({
      success: true,
      data: { message: 'Event deleted successfully' }
    } satisfies ApiResponse);
  } catch (error) {
    console.error('Error deleting event:', error);
    return Response.json({
      success: false,
      error: 'Failed to delete event'
    } satisfies ApiResponse, { status: 500 });
  }
}
