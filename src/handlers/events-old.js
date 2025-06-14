/**
 * Events Handler - Core functionality for events and flyer management
 */
export class EventsHandler {
  constructor(env) {
    this.env = env;
    this.kv = env.EVENTS_KV || env.FW_KV;
    this.r2 = env.R2_BUCKET || env.FW_R2;
  }

  async handleRequest(request, action) {
    const url = new URL(request.url);
    const method = request.method;

    try {
      // Route to appropriate handler based on action and method
      switch (action) {
        case 'list':
          return await this.listEvents(request);
        case 'upload':
          return await this.uploadEvent(request);
        case 'create':
          return await this.createEvent(request);
        case 'update':
          return await this.updateEvent(request);
        case 'delete':
          return await this.deleteEvent(request);
        case 'slideshow':
          return await this.getSlideshowData(request);
        case 'reorder':
          return await this.reorderSlideshow(request);
        case 'unified':
          return await this.getUnifiedListings(request);
        case 'dedupe':
          return await this.deduplicateEvents(request);
        default:
          return new Response(
            JSON.stringify({ error: 'Unknown action' }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }
    } catch (error) {
      console.error('Events handler error:', error);
      return new Response(
        JSON.stringify({ error: 'Events operation failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Enhanced Methods for Unified Event Management

  async listEvents(request) {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue') || 'all';
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const sortBy = url.searchParams.get('sort') || 'date';
    const sortOrder = url.searchParams.get('order') || 'asc';
    const includeThumbnails = url.searchParams.get('thumbnails') === 'true';

    try {
      // Get events from KV store
      const eventsKey = venue === 'all' ? 'events:all' : `events:${venue}`;
      const eventsData = await this.kv.get(eventsKey);
      
      if (!eventsData) {
        return new Response(
          JSON.stringify({ events: [], total: 0 }), 
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      let events = JSON.parse(eventsData);
      
      // Enhance events with additional data
      events = events.map(event => ({
        ...event,
        venue_display: this.getVenueDisplay(event.venue),
        date_formatted: this.formatDate(event.date),
        time_formatted: this.formatTime(event.time),
        thumbnail_url: event.thumbnailUrl || this.getDefaultThumbnail(event.venue),
        age_restriction: event.age_restriction || this.getDefaultAgeRestriction(event.venue)
      }));
      
      // Sort events
      events.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Apply pagination
      const paginatedEvents = events.slice(offset, offset + limit);

      return new Response(
        JSON.stringify({
          events: paginatedEvents,
          total: events.length,
          offset,
          limit,
          venue: venue
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('List events error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  async createEvent(request) {
    try {
      const formData = await request.formData();
      
      const eventData = {
        id: crypto.randomUUID(),
        title: formData.get('title'),
        venue: formData.get('venue'), // 'farewell', 'howdy', or 'both'
        date: formData.get('date'),
        time: formData.get('time') || this.getDefaultTime(),
        description: formData.get('description') || '',
        price: formData.get('price') || '',
        age_restriction: formData.get('age_restriction') || this.getDefaultAgeRestriction(formData.get('venue')),
        ticket_url: formData.get('ticket_url') || '',
        status: formData.get('status') || 'active',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      // Validate required fields
      if (!eventData.title || !eventData.venue || !eventData.date) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: title, venue, date'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Handle flyer upload if present
      const flyerFile = formData.get('flyer');
      if (flyerFile && flyerFile.size > 0) {
        const flyerResult = await this.uploadFlyer(flyerFile, eventData.id, eventData.venue);
        if (flyerResult.success) {
          eventData.flyerUrl = flyerResult.flyer_url;
          eventData.thumbnailUrl = flyerResult.thumbnail_url;
          eventData.filename = flyerResult.filename;
        }
      }

      // Add to venue-specific events
      if (eventData.venue !== 'both') {
        await this.addEventToVenue(eventData, eventData.venue);
      } else {
        // Add to both venues
        await this.addEventToVenue(eventData, 'farewell');
        await this.addEventToVenue(eventData, 'howdy');
      }

      // Add to unified events list
      await this.addEventToUnified(eventData);

      return new Response(JSON.stringify({
        success: true,
        event: eventData,
        message: 'Event created successfully'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Create event error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to create event',
        details: error.message
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async uploadFlyer(file, eventId, venue) {
    try {
      const timestamp = Date.now();
      const filename = `${venue}-${timestamp}-${file.name}`;
      const thumbnailName = `thumb-${filename}`;
      
      // Store original flyer
      const fileBuffer = await file.arrayBuffer();
      await this.env.GALLERY_KV.put(`flyers:${filename}`, fileBuffer);
      
      // Create thumbnail (simplified - in production you'd want proper image processing)
      await this.env.GALLERY_KV.put(`thumbnails:${thumbnailName}`, fileBuffer);
      
      const flyerUrl = `/api/gallery/flyer/${filename}`;
      const thumbnailUrl = `/api/gallery/thumbnail/${thumbnailName}`;

      return {
        success: true,
        flyer_url: flyerUrl,
        thumbnail_url: thumbnailUrl,
        filename: filename
      };
    } catch (error) {
      console.error('Flyer upload error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSlideshowData(request) {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue');
    
    if (!venue) {
      return new Response(JSON.stringify({
        error: 'Venue parameter required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const eventsData = await this.kv.get(`events:${venue}`);
      if (!eventsData) {
        return new Response(JSON.stringify({
          slides: [],
          venue,
          count: 0
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      const events = JSON.parse(eventsData);
      
      // Filter for events with flyers and active status
      const slides = events
        .filter(event => event.flyerUrl && event.status === 'active')
        .map(event => ({
          id: event.id,
          image_url: event.flyerUrl,
          thumbnail_url: event.thumbnailUrl || event.flyerUrl,
          title: event.title,
          date: event.date,
          time: event.time,
          description: event.description,
          ticket_url: event.ticket_url,
          venue: event.venue,
          slideshow_order: event.slideshow_order || 0
        }))
        .sort((a, b) => a.slideshow_order - b.slideshow_order);

      return new Response(JSON.stringify({
        slides,
        venue,
        count: slides.length
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Get slideshow data error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch slideshow data'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async getUnifiedListings(request) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const upcoming = url.searchParams.get('upcoming') === 'true';

    try {
      const allEventsData = await this.kv.get('events:all');
      if (!allEventsData) {
        return new Response(JSON.stringify({
          events: [],
          total: 0
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      let events = JSON.parse(allEventsData);
      
      // Filter for upcoming events if requested
      if (upcoming) {
        const today = new Date().toISOString().split('T')[0];
        events = events.filter(event => event.date >= today);
      }

      // Enhance with display data and thumbnails
      events = events.map(event => ({
        ...event,
        venue_display: this.getVenueDisplay(event.venue),
        date_formatted: this.formatDate(event.date),
        thumbnail_url: event.thumbnailUrl || this.getDefaultThumbnail(event.venue),
        has_tickets: !!event.ticket_url
      }));

      // Sort by date
      events.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Limit results
      const limitedEvents = events.slice(0, limit);

      return new Response(JSON.stringify({
        events: limitedEvents,
        total: limitedEvents.length,
        upcoming: upcoming
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Get unified listings error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch unified listings'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async reorderSlideshow(request) {
    try {
      const { venue, order } = await request.json();
      
      if (!venue || !Array.isArray(order)) {
        return new Response(JSON.stringify({
          error: 'Invalid request: venue and order array required'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const eventsData = await this.kv.get(`events:${venue}`);
      if (!eventsData) {
        return new Response(JSON.stringify({
          error: 'No events found for venue'
        }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const events = JSON.parse(eventsData);
      
      // Update slideshow order
      order.forEach((eventId, index) => {
        const event = events.find(e => e.id === eventId);
        if (event) {
          event.slideshow_order = index;
          event.updated = new Date().toISOString();
        }
      });

      // Save updated events
      await this.kv.put(`events:${venue}`, JSON.stringify(events));

      return new Response(JSON.stringify({
        success: true,
        message: 'Slideshow order updated successfully'
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Reorder slideshow error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to reorder slideshow'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Helper Methods
  async addEventToVenue(eventData, venue) {
    const eventsKey = `events:${venue}`;
    const existingEvents = await this.kv.get(eventsKey);
    const events = existingEvents ? JSON.parse(existingEvents) : [];
    
    events.push(eventData);
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    await this.kv.put(eventsKey, JSON.stringify(events));
  }

  async addEventToUnified(eventData) {
    const allEvents = await this.kv.get('events:all');
    const allEventsArray = allEvents ? JSON.parse(allEvents) : [];
    
    allEventsArray.push(eventData);
    allEventsArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    await this.kv.put('events:all', JSON.stringify(allEventsArray));
  }

  getDefaultTime() {
    return 'Doors at 7pm / Music at 8pm';
  }

  getDefaultAgeRestriction(venue) {
    switch (venue) {
      case 'howdy':
        return 'All ages';
      case 'farewell':
        return '21+ unless with parent or legal guardian';
      default:
        return '';
    }
  }

  getVenueDisplay(venue) {
    switch (venue) {
      case 'farewell':
        return 'Farewell Cafe';
      case 'howdy':
        return 'Howdy';
      case 'both':
        return 'Farewell & Howdy';
      default:
        return venue;
    }
  }

  getDefaultThumbnail(venue) {
    const thumbnails = {
      farewell: '/img/farewell-default.png',
      howdy: '/img/howdy-default.png',
      both: '/img/both-venues.png'
    };
    return thumbnails[venue] || '/img/event-placeholder.png';
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeString) {
    return timeString || '';
  }

  async updateEvent(request) {
    // Use existing updateEvent function but with enhanced features
    const url = new URL(request.url);
    const eventId = url.searchParams.get('id');
    
    if (!eventId) {
      return new Response(JSON.stringify({
        error: 'Event ID required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const formData = await request.formData();
      const updates = {};
      
      // Build update object from form data
      for (const [key, value] of formData.entries()) {
        if (key !== 'flyer' && value) {
          updates[key] = value;
        }
      }
      
      updates.updated = new Date().toISOString();

      // Handle flyer update if present
      const flyerFile = formData.get('flyer');
      if (flyerFile && flyerFile.size > 0) {
        const flyerResult = await this.uploadFlyer(flyerFile, eventId, updates.venue);
        if (flyerResult.success) {
          updates.flyerUrl = flyerResult.flyer_url;
          updates.thumbnailUrl = flyerResult.thumbnail_url;
          updates.filename = flyerResult.filename;
        }
      }

      // Update in all events
      const allEventsData = await this.kv.get('events:all');
      if (allEventsData) {
        const allEvents = JSON.parse(allEventsData);
        const eventIndex = allEvents.findIndex(event => event.id === eventId);
        
        if (eventIndex !== -1) {
          allEvents[eventIndex] = {
            ...allEvents[eventIndex],
            ...updates
          };
          
          await this.kv.put('events:all', JSON.stringify(allEvents));
          
          // Also update venue-specific list
          const venue = allEvents[eventIndex].venue;
          if (venue && venue !== 'both') {
            const venueEventsData = await this.kv.get(`events:${venue}`);
            if (venueEventsData) {
              const venueEvents = JSON.parse(venueEventsData);
              const venueEventIndex = venueEvents.findIndex(event => event.id === eventId);
              
              if (venueEventIndex !== -1) {
                venueEvents[venueEventIndex] = allEvents[eventIndex];
                await this.kv.put(`events:${venue}`, JSON.stringify(venueEvents));
              }
            }
          }

          return new Response(JSON.stringify({
            success: true,
            event: allEvents[eventIndex],
            message: 'Event updated successfully'
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      return new Response(JSON.stringify({
        error: 'Event not found'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Update event error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to update event'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async deleteEvent(request) {
    // Enhanced delete with proper cleanup
    const url = new URL(request.url);
    const eventId = url.searchParams.get('id');
    const venue = url.searchParams.get('venue');

    if (!eventId) {
      return new Response(JSON.stringify({
        error: 'Event ID required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      // Remove from venue-specific events
      if (venue) {
        const eventsKey = `events:${venue}`;
        const eventsData = await this.kv.get(eventsKey);
        
        if (eventsData) {
          const events = JSON.parse(eventsData);
          const filteredEvents = events.filter(event => event.id !== eventId);
          await this.kv.put(eventsKey, JSON.stringify(filteredEvents));
        }
      }

      // Remove from all events and clean up files
      const allEventsData = await this.kv.get('events:all');
      if (allEventsData) {
        const allEvents = JSON.parse(allEventsData);
        const eventToDelete = allEvents.find(event => event.id === eventId);
        
        if (eventToDelete) {
          // Delete associated files
          if (eventToDelete.filename) {
            await this.env.GALLERY_KV.delete(`flyers:${eventToDelete.filename}`);
            await this.env.GALLERY_KV.delete(`thumbnails:thumb-${eventToDelete.filename}`);
          }
          
          // Remove from all events
          const filteredAllEvents = allEvents.filter(event => event.id !== eventId);
          await this.kv.put('events:all', JSON.stringify(filteredAllEvents));
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Event deleted successfully'
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Delete event error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to delete event'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async uploadEvent(request) {
    // Legacy upload method - redirect to createEvent
    return await this.createEvent(request);
  }

  async deduplicateEvents(request) {
    // Enhanced deduplication with better logic
    try {
      const allEventsData = await this.kv.get('events:all');
      if (!allEventsData) {
        return new Response(JSON.stringify({
          message: 'No events to deduplicate'
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      const allEvents = JSON.parse(allEventsData);
      const uniqueEvents = [];
      const seen = new Set();

      // Deduplicate based on venue, date, and title similarity
      for (const event of allEvents) {
        const key = `${event.venue}-${event.date}-${event.title?.toLowerCase().trim()}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          uniqueEvents.push(event);
        }
      }

      const removedCount = allEvents.length - uniqueEvents.length;

      if (removedCount > 0) {
        // Update all events
        await this.kv.put('events:all', JSON.stringify(uniqueEvents));

        // Update venue-specific lists
        const venues = [...new Set(uniqueEvents.map(event => event.venue))];
        for (const venue of venues) {
          const venueEvents = uniqueEvents.filter(event => event.venue === venue);
          await this.kv.put(`events:${venue}`, JSON.stringify(venueEvents));
        }
      }

      return new Response(JSON.stringify({
        success: true,
        removedCount,
        totalEvents: uniqueEvents.length,
        message: `Removed ${removedCount} duplicate events`
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Deduplicate events error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to deduplicate events'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}
