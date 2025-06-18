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

// Helper function to get all events from both new and legacy KV, and EVENTS_HOWDY/EVENTS_FAREWELL
async function getAllEvents(env: Env): Promise<Event[]> {
  let events: Event[] = [];
  try {
    // New events (current KV)
    const listResponse = await env.EVENTS_KV.list({ prefix: 'event_' });
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
    // Legacy events (old unified and per-venue keys)
    const legacyKeys = ['events:all', 'events:farewell', 'events:howdy'];
    for (const legacyKey of legacyKeys) {
      const legacyData = await env.GALLERY_KV.get(legacyKey);
      if (legacyData) {
        try {
          const legacyEvents = JSON.parse(legacyData);
          for (const legacyEvent of legacyEvents) {
            events.push({
              id: legacyEvent.id,
              title: legacyEvent.title,
              venue: legacyEvent.venue === 'farewell' || legacyEvent.venue === 'howdy' ? legacyEvent.venue : 'farewell',
              date: legacyEvent.date,
              time: legacyEvent.time,
              description: legacyEvent.description,
              age_restriction: legacyEvent.age_restriction || legacyEvent.ageRestriction,
              suggested_price: legacyEvent.price || legacyEvent.suggested_price,
              ticket_url: legacyEvent.ticket_url,
              flyer_url: legacyEvent.flyerUrl || legacyEvent.flyer_url || '',
              thumbnail_url: legacyEvent.thumbnailUrl || legacyEvent.thumbnail_url || legacyEvent.flyerUrl || legacyEvent.flyer_url || '',
              status: legacyEvent.status === 'cancelled' || legacyEvent.status === 'postponed' ? legacyEvent.status : 'active',
              featured: !!legacyEvent.featured,
              slideshow_order: legacyEvent.slideshow_order,
              created_at: legacyEvent.created || legacyEvent.created_at || new Date().toISOString(),
              updated_at: legacyEvent.updated || legacyEvent.updated_at || new Date().toISOString(),
              created_by: legacyEvent.created_by || '',
              last_modified_by: legacyEvent.last_modified_by || ''
            } as Event);
          }
        } catch (e) {
          console.error(`Error parsing legacy events from ${legacyKey}:`, e);
        }
      }
    }
    // Add events from EVENTS_HOWDY and EVENTS_FAREWELL (if present)
    const howdyData = await env.EVENTS_HOWDY?.get('current');
    if (howdyData) {
      try {
        const howdyEvents = JSON.parse(howdyData);
        for (const ev of howdyEvents) {
          events.push({
            ...ev,
            venue: 'howdy',
            flyer_url: ev.flyer_url || ev.flyerUrl || '',
            thumbnail_url: ev.thumbnail_url || ev.thumbnailUrl || '',
          });
        }
      } catch (e) { console.error('Error parsing EVENTS_HOWDY:', e); }
    }
    const farewellData = await env.EVENTS_FAREWELL?.get('current');
    if (farewellData) {
      try {
        const farewellEvents = JSON.parse(farewellData);
        for (const ev of farewellEvents) {
          events.push({
            ...ev,
            venue: 'farewell',
            flyer_url: ev.flyer_url || ev.flyerUrl || '',
            thumbnail_url: ev.thumbnail_url || ev.thumbnailUrl || '',
          });
        }
      } catch (e) { console.error('Error parsing EVENTS_FAREWELL:', e); }
    }
    return events;
  } catch (error) {
    console.error('Error fetching events from KV:', error);
    return events;
  }
}

// Fix venue filtering to only use allowed values
async function handleEventsList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') as 'farewell' | 'howdy' | null;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const thumbnails = url.searchParams.get('thumbnails') === 'true';

  try {
    let events = await getAllEvents(env);
    if (venue) {
      events = events.filter(event => event.venue === venue);
    }
    // Sort by date (soonest first)
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

// Fix flyer file handling in create/update event
async function createEvent(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    const venue = formData.get('venue');
    const newEvent: Event = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venue: venue === 'farewell' || venue === 'howdy' ? venue : 'farewell',
      description: formData.get('description') as string || '',
      suggested_price: formData.get('suggestedPrice') as string || '',
      ticket_url: formData.get('ticketLink') as string || '',
      age_restriction: formData.get('ageRestriction') as string || '',
      status: 'active',
      featured: false,
      slideshow_order: parseInt(formData.get('slideshow_order') as string || '0'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: '',
      last_modified_by: ''
    };
    // Handle flyer upload if present
    const flyerFile = formData.get('flyer');
    if (flyerFile && typeof flyerFile === 'object' && 'size' in flyerFile && (flyerFile as any).size > 0) {
      // TODO: Upload flyer to R2 and set URLs
      newEvent.flyer_url = '/img/placeholder.png';
      newEvent.thumbnail_url = '/img/placeholder.png';
    }
    // Get existing events
    const eventsData = await env.EVENTS_KV.get('events');
    let events: Event[] = [];
    if (eventsData) {
      events = JSON.parse(eventsData);
    }
    events.push(newEvent);
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
    const venue = formData.get('venue');
    // Update event
    const existingEvent = events[eventIndex];
    if (!existingEvent) {
      return Response.json({
        success: false,
        error: 'Event not found'
      } satisfies ApiResponse, { status: 404 });
    }
    const updatedEvent: Event = {
      ...existingEvent,
      id: existingEvent.id,
      title: formData.get('title') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venue: venue === 'farewell' || venue === 'howdy' ? venue : 'farewell',
      description: formData.get('description') as string || '',
      suggested_price: formData.get('suggestedPrice') as string || '',
      ticket_url: formData.get('ticketLink') as string || '',
      age_restriction: formData.get('ageRestriction') as string || '',
      status: existingEvent.status,
      featured: existingEvent.featured,
      slideshow_order: parseInt(formData.get('slideshow_order') as string || '0'),
      updated_at: new Date().toISOString(),
    };
    const flyerFile2 = formData.get('flyer');
    if (flyerFile2 && typeof flyerFile2 === 'object' && 'size' in flyerFile2 && (flyerFile2 as any).size > 0) {
      // TODO: Upload flyer to R2 and set URLs
      updatedEvent.flyer_url = '/img/placeholder.png';
      updatedEvent.thumbnail_url = '/img/placeholder.png';
    }
    events[eventIndex] = updatedEvent;
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
