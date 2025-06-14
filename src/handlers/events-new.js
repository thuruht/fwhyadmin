/**
 * Events Handler - Core functionality for events and flyer management
 */
export class EventsHandler {
  constructor(env) {
    this.env = env;
    this.kv = env.EVENTS_KV || env.FW_KV;
    this.r2 = env.R2_BUCKET || env.FW_R2;
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    try {
      // Route based on pathname and method
      if (pathname.includes('/events/list')) {
        return await this.listEvents(request);
      } else if (pathname.includes('/events/slideshow')) {
        return await this.getSlideshowData(request);
      } else if (pathname.includes('/events/upload') && method === 'POST') {
        return await this.uploadEvent(request);
      } else if (pathname.includes('/events/create') && method === 'POST') {
        return await this.createEvent(request);
      } else if (pathname.includes('/events/update') && method === 'PUT') {
        return await this.updateEvent(request);
      } else if (pathname.includes('/events/delete') && method === 'DELETE') {
        return await this.deleteEvent(request);
      } else if (pathname.includes('/events/reorder') && method === 'POST') {
        return await this.reorderSlideshow(request);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Events handler error:', error);
      return new Response(
        JSON.stringify({ error: 'Operation failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // List events with unified format
  async listEvents(request) {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue') || 'all';
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const includeThumbnails = url.searchParams.get('thumbnails') === 'true';

    try {
      // Get all events from KV
      const eventsKey = 'events:all';
      const eventsData = await this.kv.get(eventsKey);
      
      let events = [];
      if (eventsData) {
        events = JSON.parse(eventsData);
      }

      // Filter by venue if specified
      if (venue !== 'all') {
        events = events.filter(event => 
          event.venue && event.venue.toLowerCase() === venue.toLowerCase()
        );
      }

      // Sort by date (upcoming first)
      const now = new Date();
      events.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      // Limit results
      events = events.slice(0, limit);

      // Enhance with display data
      events = events.map(event => ({
        ...event,
        venue_display: this.getVenueDisplay(event.venue),
        date_formatted: this.formatDate(event.date),
        thumbnail_url: includeThumbnails ? (event.thumbnail_url || this.getDefaultThumbnail(event.venue)) : undefined,
        age_restriction: event.age_restriction || this.getDefaultAgeRestriction(event.venue),
        default_time: event.time || this.getDefaultTime(event.venue)
      }));

      return new Response(
        JSON.stringify({ 
          events, 
          total: events.length,
          venue: venue,
          timestamp: new Date().toISOString()
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error listing events:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to list events' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Get slideshow data for venue-specific flyer carousel
  async getSlideshowData(request) {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue') || 'farewell';

    try {
      // Get slideshow order from KV
      const slideshowKey = `slideshow:${venue}`;
      const slideshowData = await this.kv.get(slideshowKey);
      
      let slideshow = [];
      if (slideshowData) {
        slideshow = JSON.parse(slideshowData);
      } else {
        // If no custom order, get recent events for this venue
        const eventsData = await this.kv.get('events:all');
        if (eventsData) {
          const allEvents = JSON.parse(eventsData);
          slideshow = allEvents
            .filter(event => event.venue && event.venue.toLowerCase() === venue.toLowerCase())
            .filter(event => event.flyer_url || event.image_url)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20) // Max 20 slides
            .map(event => ({
              id: event.id,
              title: event.title,
              date: event.date,
              image_url: event.flyer_url || event.image_url,
              thumbnail_url: event.thumbnail_url,
              venue: event.venue,
              order: 0
            }));
        }
      }

      return new Response(
        JSON.stringify({ 
          slideshow, 
          venue,
          total: slideshow.length 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error getting slideshow data:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get slideshow data' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Upload event with flyer
  async uploadEvent(request) {
    try {
      const formData = await request.formData();
      const file = formData.get('flyer');
      const eventData = {
        title: formData.get('title'),
        date: formData.get('date'),
        time: formData.get('time'),
        venue: formData.get('venue'),
        age_restriction: formData.get('age_restriction'),
        price: formData.get('price'),
        description: formData.get('description'),
        ticket_url: formData.get('ticket_url')
      };

      // Validate required fields
      if (!eventData.title || !eventData.date || !eventData.venue) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: title, date, venue' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Auto-populate venue defaults
      eventData.age_restriction = eventData.age_restriction || this.getDefaultAgeRestriction(eventData.venue);
      eventData.time = eventData.time || this.getDefaultTime(eventData.venue);

      // Generate unique ID
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      eventData.id = eventId;
      eventData.created_at = new Date().toISOString();

      let flyerUrl = null;
      let thumbnailUrl = null;

      // Upload flyer if provided
      if (file && file.size > 0) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!allowedTypes.includes(fileExtension)) {
          return new Response(
            JSON.stringify({ error: 'Invalid file type. Use JPG, PNG, GIF, or WebP' }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Upload to R2
        const fileName = `flyers/${eventId}.${fileExtension}`;
        const thumbnailName = `thumbnails/${eventId}_thumb.${fileExtension}`;
        
        await this.r2.put(fileName, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        // Create thumbnail (simplified - in production you'd resize the image)
        await this.r2.put(thumbnailName, file.stream(), {
          httpMetadata: { contentType: file.type }
        });

        flyerUrl = `https://your-r2-domain.com/${fileName}`;
        thumbnailUrl = `https://your-r2-domain.com/${thumbnailName}`;
      }

      eventData.flyer_url = flyerUrl;
      eventData.thumbnail_url = thumbnailUrl;

      // Save event
      const saveResult = await this.saveEvent(eventData);
      
      if (saveResult.success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            event: eventData,
            message: 'Event uploaded successfully' 
          }), 
          { headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to save event' }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

    } catch (error) {
      console.error('Error uploading event:', error);
      return new Response(
        JSON.stringify({ error: 'Upload failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Create event without flyer upload
  async createEvent(request) {
    try {
      const eventData = await request.json();

      // Validate required fields
      if (!eventData.title || !eventData.date || !eventData.venue) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: title, date, venue' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Auto-populate venue defaults
      eventData.age_restriction = eventData.age_restriction || this.getDefaultAgeRestriction(eventData.venue);
      eventData.time = eventData.time || this.getDefaultTime(eventData.venue);

      // Generate unique ID
      eventData.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      eventData.created_at = new Date().toISOString();

      // Save event
      const saveResult = await this.saveEvent(eventData);
      
      if (saveResult.success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            event: eventData,
            message: 'Event created successfully' 
          }), 
          { headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to save event' }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

    } catch (error) {
      console.error('Error creating event:', error);
      return new Response(
        JSON.stringify({ error: 'Creation failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Update existing event
  async updateEvent(request) {
    try {
      const url = new URL(request.url);
      const eventId = url.searchParams.get('id');
      
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'Event ID required' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const updateData = await request.json();
      
      // Get existing events
      const eventsData = await this.kv.get('events:all');
      let events = eventsData ? JSON.parse(eventsData) : [];
      
      // Find and update event
      const eventIndex = events.findIndex(event => event.id === eventId);
      if (eventIndex === -1) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update event data
      events[eventIndex] = {
        ...events[eventIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Save back to KV
      await this.kv.put('events:all', JSON.stringify(events));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          event: events[eventIndex],
          message: 'Event updated successfully' 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error updating event:', error);
      return new Response(
        JSON.stringify({ error: 'Update failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Delete event
  async deleteEvent(request) {
    try {
      const url = new URL(request.url);
      const eventId = url.searchParams.get('id');
      
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'Event ID required' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get existing events
      const eventsData = await this.kv.get('events:all');
      let events = eventsData ? JSON.parse(eventsData) : [];
      
      // Find event to delete
      const eventIndex = events.findIndex(event => event.id === eventId);
      if (eventIndex === -1) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const deletedEvent = events[eventIndex];
      
      // Remove from array
      events.splice(eventIndex, 1);

      // Save back to KV
      await this.kv.put('events:all', JSON.stringify(events));

      // TODO: Also delete flyer files from R2 if they exist
      if (deletedEvent.flyer_url) {
        // Delete flyer and thumbnail from R2
        // This would require extracting the file path from the URL
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Event deleted successfully' 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error deleting event:', error);
      return new Response(
        JSON.stringify({ error: 'Deletion failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Reorder slideshow
  async reorderSlideshow(request) {
    try {
      const { venue, slideshow } = await request.json();
      
      if (!venue || !slideshow) {
        return new Response(
          JSON.stringify({ error: 'Venue and slideshow data required' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Save slideshow order
      const slideshowKey = `slideshow:${venue}`;
      await this.kv.put(slideshowKey, JSON.stringify(slideshow));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Slideshow order updated successfully' 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error reordering slideshow:', error);
      return new Response(
        JSON.stringify({ error: 'Reorder failed', details: error.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Helper Methods

  async saveEvent(eventData) {
    try {
      // Get existing events
      const eventsData = await this.kv.get('events:all');
      let events = eventsData ? JSON.parse(eventsData) : [];
      
      // Add new event
      events.push(eventData);
      
      // Sort by date
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Save back to KV
      await this.kv.put('events:all', JSON.stringify(events));
      
      return { success: true };
    } catch (error) {
      console.error('Error saving event:', error);
      return { success: false, error: error.message };
    }
  }

  getVenueDisplay(venue) {
    const venues = {
      'farewell': 'Farewell Cafe',
      'howdy': 'Howdy Thrift',
      'both': 'Both Venues'
    };
    return venues[venue?.toLowerCase()] || venue || 'Unknown Venue';
  }

  getDefaultAgeRestriction(venue) {
    const defaults = {
      'farewell': '21+ unless with parent or legal guardian',
      'howdy': 'All ages'
    };
    return defaults[venue?.toLowerCase()] || 'All ages';
  }

  getDefaultTime(venue) {
    return 'Doors at 7pm / Music at 8pm';
  }

  getDefaultThumbnail(venue) {
    const defaults = {
      'farewell': '/img/fwcal.png',
      'howdy': '/img/hycal.png'
    };
    return defaults[venue?.toLowerCase()] || '/img/placeholder.png';
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  formatTime(timeString) {
    try {
      if (!timeString) return '';
      // Simple time formatting - could be enhanced
      return timeString;
    } catch (error) {
      return timeString;
    }
  }
}
