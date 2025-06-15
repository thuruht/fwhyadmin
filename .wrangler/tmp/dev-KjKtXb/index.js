var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-r8iENX/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-r8iENX/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/middleware/cors.js
function handleCORS(response = null) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    // Will be restricted in production
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400"
    // 24 hours
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
}
__name(handleCORS, "handleCORS");

// src/middleware/auth.js
async function authenticate(request, env) {
  try {
    const sessionToken = getSessionTokenFromRequest(request);
    if (sessionToken) {
      const sessionResult = await validateSession(sessionToken, env);
      if (sessionResult.success) {
        return sessionResult;
      }
    }
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      return await validateApiToken(token, env);
    }
    return { success: false, error: "No valid authentication provided" };
  } catch (error) {
    console.error("Auth error:", error);
    return { success: false, error: "Authentication failed" };
  }
}
__name(authenticate, "authenticate");
async function validateSession(sessionToken, env) {
  try {
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.SESSIONS_KV?.get(sessionKey);
    if (!sessionData) {
      return { success: false, error: "Invalid session" };
    }
    const session = JSON.parse(sessionData);
    if (session.expires < Date.now()) {
      await env.SESSIONS_KV?.delete(sessionKey);
      return { success: false, error: "Session expired" };
    }
    return {
      success: true,
      user: {
        id: session.username,
        username: session.username,
        role: "admin",
        venues: ["farewell", "howdy"]
      }
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return { success: false, error: "Session validation failed" };
  }
}
__name(validateSession, "validateSession");
async function validateApiToken(token, env) {
  try {
    const tokenKey = `api_token:${token}`;
    const tokenData = await env.SESSIONS_KV?.get(tokenKey);
    if (!tokenData) {
      const adminToken = env.ADMIN_API_TOKEN || "dev-admin-token-2025";
      if (token === adminToken) {
        return {
          success: true,
          user: {
            id: "api-admin",
            role: "admin",
            venues: ["farewell", "howdy"]
          }
        };
      }
      return { success: false, error: "Invalid API token" };
    }
    const tokenInfo = JSON.parse(tokenData);
    if (tokenInfo.expires && Date.now() > tokenInfo.expires) {
      await env.SESSIONS_KV?.delete(tokenKey);
      return { success: false, error: "API token expired" };
    }
    return {
      success: true,
      user: tokenInfo.user
    };
  } catch (error) {
    console.error("API token validation error:", error);
    return { success: false, error: "API token validation failed" };
  }
}
__name(validateApiToken, "validateApiToken");
function getSessionTokenFromRequest(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {});
  return cookies.session || null;
}
__name(getSessionTokenFromRequest, "getSessionTokenFromRequest");

// src/handlers/events.js
var EventsHandler = class {
  static {
    __name(this, "EventsHandler");
  }
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
      if (pathname.includes("/events/list")) {
        return await this.listEvents(request);
      } else if (pathname.includes("/events/slideshow")) {
        return await this.getSlideshowData(request);
      } else if (pathname.includes("/events/upload") && method === "POST") {
        return await this.uploadEvent(request);
      } else if (pathname.includes("/events/create") && method === "POST") {
        return await this.createEvent(request);
      } else if (pathname.includes("/events/update") && method === "PUT") {
        return await this.updateEvent(request);
      } else if (pathname.includes("/events/delete") && method === "DELETE") {
        return await this.deleteEvent(request);
      } else if (pathname.includes("/events/reorder") && method === "POST") {
        return await this.reorderSlideshow(request);
      } else {
        return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Events handler error:", error);
      return new Response(
        JSON.stringify({ error: "Operation failed", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // List events with unified format
  async listEvents(request) {
    const url = new URL(request.url);
    const venue = url.searchParams.get("venue") || "all";
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const includeThumbnails = url.searchParams.get("thumbnails") === "true";
    try {
      const eventsKey = "events:all";
      const eventsData = await this.kv.get(eventsKey);
      let events = [];
      if (eventsData) {
        events = JSON.parse(eventsData);
      }
      if (venue !== "all") {
        events = events.filter(
          (event) => event.venue && event.venue.toLowerCase() === venue.toLowerCase()
        );
      }
      const now = /* @__PURE__ */ new Date();
      events.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
      events = events.slice(0, limit);
      events = events.map((event) => ({
        ...event,
        venue_display: this.getVenueDisplay(event.venue),
        date_formatted: this.formatDate(event.date),
        thumbnail_url: includeThumbnails ? event.thumbnail_url || this.getDefaultThumbnail(event.venue) : void 0,
        age_restriction: event.age_restriction || this.getDefaultAgeRestriction(event.venue),
        default_time: event.time || this.getDefaultTime(event.venue)
      }));
      return new Response(
        JSON.stringify({
          events,
          total: events.length,
          venue,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error listing events:", error);
      return new Response(
        JSON.stringify({ error: "Failed to list events" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Get slideshow data for venue-specific flyer carousel
  async getSlideshowData(request) {
    const url = new URL(request.url);
    const venue = url.searchParams.get("venue") || "farewell";
    try {
      const slideshowKey = `slideshow:${venue}`;
      const slideshowData = await this.kv.get(slideshowKey);
      let slideshow = [];
      if (slideshowData) {
        slideshow = JSON.parse(slideshowData);
      } else {
        const eventsData = await this.kv.get("events:all");
        if (eventsData) {
          const allEvents = JSON.parse(eventsData);
          slideshow = allEvents.filter((event) => event.venue && event.venue.toLowerCase() === venue.toLowerCase()).filter((event) => event.flyer_url || event.image_url).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map((event) => ({
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
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error getting slideshow data:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get slideshow data" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Upload event with flyer
  async uploadEvent(request) {
    try {
      const formData = await request.formData();
      const file = formData.get("flyer");
      const eventData = {
        title: formData.get("title"),
        date: formData.get("date"),
        time: formData.get("time"),
        venue: formData.get("venue"),
        age_restriction: formData.get("age_restriction"),
        price: formData.get("price"),
        description: formData.get("description"),
        ticket_url: formData.get("ticket_url")
      };
      if (!eventData.title || !eventData.date || !eventData.venue) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: title, date, venue" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      eventData.age_restriction = eventData.age_restriction || this.getDefaultAgeRestriction(eventData.venue);
      eventData.time = eventData.time || this.getDefaultTime(eventData.venue);
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      eventData.id = eventId;
      eventData.created_at = (/* @__PURE__ */ new Date()).toISOString();
      let flyerUrl = null;
      let thumbnailUrl = null;
      if (file && file.size > 0) {
        const fileExtension = file.name.split(".").pop().toLowerCase();
        const allowedTypes = ["jpg", "jpeg", "png", "gif", "webp"];
        if (!allowedTypes.includes(fileExtension)) {
          return new Response(
            JSON.stringify({ error: "Invalid file type. Use JPG, PNG, GIF, or WebP" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const fileName = `flyers/${eventId}.${fileExtension}`;
        const thumbnailName = `thumbnails/${eventId}_thumb.${fileExtension}`;
        await this.r2.put(fileName, file.stream(), {
          httpMetadata: { contentType: file.type }
        });
        await this.r2.put(thumbnailName, file.stream(), {
          httpMetadata: { contentType: file.type }
        });
        flyerUrl = `https://your-r2-domain.com/${fileName}`;
        thumbnailUrl = `https://your-r2-domain.com/${thumbnailName}`;
      }
      eventData.flyer_url = flyerUrl;
      eventData.thumbnail_url = thumbnailUrl;
      const saveResult = await this.saveEvent(eventData);
      if (saveResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            event: eventData,
            message: "Event uploaded successfully"
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to save event" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("Error uploading event:", error);
      return new Response(
        JSON.stringify({ error: "Upload failed", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Create event without flyer upload
  async createEvent(request) {
    try {
      const eventData = await request.json();
      if (!eventData.title || !eventData.date || !eventData.venue) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: title, date, venue" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      eventData.age_restriction = eventData.age_restriction || this.getDefaultAgeRestriction(eventData.venue);
      eventData.time = eventData.time || this.getDefaultTime(eventData.venue);
      eventData.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      eventData.created_at = (/* @__PURE__ */ new Date()).toISOString();
      const saveResult = await this.saveEvent(eventData);
      if (saveResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            event: eventData,
            message: "Event created successfully"
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to save event" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("Error creating event:", error);
      return new Response(
        JSON.stringify({ error: "Creation failed", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Update existing event
  async updateEvent(request) {
    try {
      const url = new URL(request.url);
      const eventId = url.searchParams.get("id");
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "Event ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const updateData = await request.json();
      const eventsData = await this.kv.get("events:all");
      let events = eventsData ? JSON.parse(eventsData) : [];
      const eventIndex = events.findIndex((event) => event.id === eventId);
      if (eventIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      events[eventIndex] = {
        ...events[eventIndex],
        ...updateData,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.kv.put("events:all", JSON.stringify(events));
      return new Response(
        JSON.stringify({
          success: true,
          event: events[eventIndex],
          message: "Event updated successfully"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error updating event:", error);
      return new Response(
        JSON.stringify({ error: "Update failed", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Delete event
  async deleteEvent(request) {
    try {
      const url = new URL(request.url);
      const eventId = url.searchParams.get("id");
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "Event ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const eventsData = await this.kv.get("events:all");
      let events = eventsData ? JSON.parse(eventsData) : [];
      const eventIndex = events.findIndex((event) => event.id === eventId);
      if (eventIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      const deletedEvent = events[eventIndex];
      events.splice(eventIndex, 1);
      await this.kv.put("events:all", JSON.stringify(events));
      if (deletedEvent.flyer_url) {
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: "Event deleted successfully"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error deleting event:", error);
      return new Response(
        JSON.stringify({ error: "Deletion failed", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Reorder slideshow
  async reorderSlideshow(request) {
    try {
      const { venue, slideshow } = await request.json();
      if (!venue || !slideshow) {
        return new Response(
          JSON.stringify({ error: "Venue and slideshow data required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const slideshowKey = `slideshow:${venue}`;
      await this.kv.put(slideshowKey, JSON.stringify(slideshow));
      return new Response(
        JSON.stringify({
          success: true,
          message: "Slideshow order updated successfully"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error reordering slideshow:", error);
      return new Response(
        JSON.stringify({ error: "Reorder failed", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // Helper Methods
  async saveEvent(eventData) {
    try {
      const eventsData = await this.kv.get("events:all");
      let events = eventsData ? JSON.parse(eventsData) : [];
      events.push(eventData);
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      await this.kv.put("events:all", JSON.stringify(events));
      return { success: true };
    } catch (error) {
      console.error("Error saving event:", error);
      return { success: false, error: error.message };
    }
  }
  getVenueDisplay(venue) {
    const venues = {
      "farewell": "Farewell Cafe",
      "howdy": "Howdy Thrift",
      "both": "Both Venues"
    };
    return venues[venue?.toLowerCase()] || venue || "Unknown Venue";
  }
  getDefaultAgeRestriction(venue) {
    const defaults = {
      "farewell": "21+ unless with parent or legal guardian",
      "howdy": "All ages"
    };
    return defaults[venue?.toLowerCase()] || "All ages";
  }
  getDefaultTime(venue) {
    return "Doors at 7pm / Music at 8pm";
  }
  getDefaultThumbnail(venue) {
    const defaults = {
      "farewell": "/img/fwcal.png",
      "howdy": "/img/hycal.png"
    };
    return defaults[venue?.toLowerCase()] || "/img/placeholder.png";
  }
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch (error) {
      return dateString;
    }
  }
  formatTime(timeString) {
    try {
      if (!timeString) return "";
      return timeString;
    } catch (error) {
      return timeString;
    }
  }
};

// src/handlers/gallery.js
async function handleGallery(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;
  try {
    switch (action) {
      case "list":
        return await listGalleryItems(request, env);
      case "upload":
        return await uploadGalleryItem(request, env);
      case "delete":
        return await deleteGalleryItem(request, env);
      case "flyer":
        return await serveFlyer(request, env);
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Gallery handler error:", error);
    return new Response(
      JSON.stringify({ error: "Gallery operation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleGallery, "handleGallery");
async function listGalleryItems(request, env) {
  const url = new URL(request.url);
  const venue = url.searchParams.get("venue") || "all";
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  const offset = parseInt(url.searchParams.get("offset")) || 0;
  try {
    const flyerKeys = await env.GALLERY_KV.list({ prefix: "flyers:" });
    let flyers = [];
    for (const key of flyerKeys.keys) {
      try {
        const metadata = await env.GALLERY_KV.getWithMetadata(key.name);
        if (metadata.metadata) {
          const flyerInfo = {
            filename: key.name.replace("flyers:", ""),
            ...metadata.metadata,
            url: `/api/gallery/flyer/${key.name.replace("flyers:", "")}`,
            size: key.size
          };
          if (venue === "all" || flyerInfo.venue === venue) {
            flyers.push(flyerInfo);
          }
        }
      } catch (error) {
        console.error("Error getting flyer metadata:", error);
      }
    }
    flyers.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
    const paginatedFlyers = flyers.slice(offset, offset + limit);
    return new Response(
      JSON.stringify({
        flyers: paginatedFlyers,
        total: flyers.length,
        offset,
        limit
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("List gallery items error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list gallery items" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(listGalleryItems, "listGalleryItems");
async function uploadGalleryItem(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const venue = formData.get("venue") || "farewell";
    const title = formData.get("title") || "";
    const description = formData.get("description") || "";
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only images are allowed." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 10MB." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const timestamp = Date.now();
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${venue}-${timestamp}-${sanitizedOriginalName}`;
    const fileBuffer = await file.arrayBuffer();
    const metadata = {
      venue,
      title,
      description,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploaded: (/* @__PURE__ */ new Date()).toISOString()
    };
    await env.GALLERY_KV.put(`flyers:${filename}`, fileBuffer, {
      metadata
    });
    return new Response(
      JSON.stringify({
        success: true,
        filename,
        url: `/api/gallery/flyer/${filename}`,
        metadata,
        message: "File uploaded successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upload gallery item error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to upload file" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(uploadGalleryItem, "uploadGalleryItem");
async function deleteGalleryItem(request, env) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");
    if (!filename) {
      return new Response(
        JSON.stringify({ error: "Filename required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const key = `flyers:${filename}`;
    const existingFile = await env.GALLERY_KV.get(key);
    if (!existingFile) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    await env.GALLERY_KV.delete(key);
    return new Response(
      JSON.stringify({
        success: true,
        message: "File deleted successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete gallery item error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete file" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(deleteGalleryItem, "deleteGalleryItem");
async function serveFlyer(request, env) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const filename = pathParts[pathParts.length - 1];
    if (!filename) {
      return new Response("Filename required", { status: 400 });
    }
    const key = `flyers:${filename}`;
    const fileData = await env.GALLERY_KV.getWithMetadata(key, "arrayBuffer");
    if (!fileData.value) {
      return new Response("File not found", { status: 404 });
    }
    const headers = {
      "Content-Type": fileData.metadata?.mimeType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000",
      // 1 year cache
      "Content-Length": fileData.value.byteLength.toString()
    };
    return new Response(fileData.value, { headers });
  } catch (error) {
    console.error("Serve flyer error:", error);
    return new Response("Failed to serve file", { status: 500 });
  }
}
__name(serveFlyer, "serveFlyer");

// src/handlers/blog.js
async function handleBlog(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;
  try {
    switch (action) {
      case "public":
        return await getPublicPosts(request, env);
      case "list":
        return await listPosts(request, env);
      case "create":
        return await createPost(request, env);
      case "update":
        return await updatePost(request, env);
      case "delete":
        return await deletePost(request, env);
      case "publish":
        return await publishPost(request, env);
      case "featured":
        return await manageFeatured(request, env);
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Blog handler error:", error);
    return new Response(
      JSON.stringify({ error: "Blog operation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleBlog, "handleBlog");
async function getPublicPosts(request, env) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit")) || 10;
  const offset = parseInt(url.searchParams.get("offset")) || 0;
  const type = url.searchParams.get("type") || "all";
  try {
    const postsData = await env.BLOG_KV.get("blog:posts");
    const featuredData = await env.BLOG_KV.get("blog:featured");
    let posts = [];
    let featured = null;
    if (postsData) {
      const allPosts = JSON.parse(postsData);
      posts = allPosts.filter((post) => post.status === "published");
      posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      posts = posts.slice(offset, offset + limit);
    }
    if (featuredData && (type === "featured" || type === "all")) {
      const featuredPost = JSON.parse(featuredData);
      if (featuredPost.status === "published") {
        featured = featuredPost;
      }
    }
    const response = {
      posts: type === "featured" ? [] : posts,
      featured: type === "posts" ? null : featured,
      total: posts.length,
      offset,
      limit
    };
    return new Response(
      JSON.stringify(response),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get public posts error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch posts" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getPublicPosts, "getPublicPosts");
async function listPosts(request, env) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit")) || 50;
  const offset = parseInt(url.searchParams.get("offset")) || 0;
  const status = url.searchParams.get("status");
  try {
    const postsData = await env.BLOG_KV.get("blog:posts");
    if (!postsData) {
      return new Response(
        JSON.stringify({ posts: [], total: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    let posts = JSON.parse(postsData);
    if (status) {
      posts = posts.filter((post) => post.status === status);
    }
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paginatedPosts = posts.slice(offset, offset + limit);
    return new Response(
      JSON.stringify({
        posts: paginatedPosts,
        total: posts.length,
        offset,
        limit
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("List posts error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list posts" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(listPosts, "listPosts");
async function createPost(request, env) {
  try {
    const postData = await request.json();
    const { title, content, excerpt, status } = postData;
    if (!title || !content) {
      return new Response(
        JSON.stringify({ error: "Title and content required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const post = {
      id: crypto.randomUUID(),
      title,
      content,
      excerpt: excerpt || content.substring(0, 200) + "...",
      status: status || "draft",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      publishedAt: status === "published" ? (/* @__PURE__ */ new Date()).toISOString() : null
    };
    const existingData = await env.BLOG_KV.get("blog:posts");
    const posts = existingData ? JSON.parse(existingData) : [];
    posts.push(post);
    await env.BLOG_KV.put("blog:posts", JSON.stringify(posts));
    return new Response(
      JSON.stringify({
        success: true,
        post,
        message: "Post created successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(createPost, "createPost");
async function updatePost(request, env) {
  try {
    const postData = await request.json();
    const { id, title, content, excerpt, status } = postData;
    if (!id) {
      return new Response(
        JSON.stringify({ error: "Post ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const existingData = await env.BLOG_KV.get("blog:posts");
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: "Posts not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const posts = JSON.parse(existingData);
    const postIndex = posts.findIndex((post) => post.id === id);
    if (postIndex === -1) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const existingPost = posts[postIndex];
    posts[postIndex] = {
      ...existingPost,
      title: title || existingPost.title,
      content: content || existingPost.content,
      excerpt: excerpt || existingPost.excerpt,
      status: status || existingPost.status,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      publishedAt: status === "published" && !existingPost.publishedAt ? (/* @__PURE__ */ new Date()).toISOString() : existingPost.publishedAt
    };
    await env.BLOG_KV.put("blog:posts", JSON.stringify(posts));
    return new Response(
      JSON.stringify({
        success: true,
        post: posts[postIndex],
        message: "Post updated successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(updatePost, "updatePost");
async function deletePost(request, env) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("id");
    if (!postId) {
      return new Response(
        JSON.stringify({ error: "Post ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const existingData = await env.BLOG_KV.get("blog:posts");
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: "Posts not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const posts = JSON.parse(existingData);
    const filteredPosts = posts.filter((post) => post.id !== postId);
    if (filteredPosts.length === posts.length) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    await env.BLOG_KV.put("blog:posts", JSON.stringify(filteredPosts));
    return new Response(
      JSON.stringify({
        success: true,
        message: "Post deleted successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(deletePost, "deletePost");
async function publishPost(request, env) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("id");
    if (!postId) {
      return new Response(
        JSON.stringify({ error: "Post ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const existingData = await env.BLOG_KV.get("blog:posts");
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: "Posts not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const posts = JSON.parse(existingData);
    const postIndex = posts.findIndex((post) => post.id === postId);
    if (postIndex === -1) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    posts[postIndex].status = "published";
    posts[postIndex].publishedAt = (/* @__PURE__ */ new Date()).toISOString();
    posts[postIndex].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await env.BLOG_KV.put("blog:posts", JSON.stringify(posts));
    return new Response(
      JSON.stringify({
        success: true,
        post: posts[postIndex],
        message: "Post published successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Publish post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to publish post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(publishPost, "publishPost");
async function manageFeatured(request, env) {
  const method = request.method;
  try {
    if (method === "GET") {
      const featuredData = await env.BLOG_KV.get("blog:featured");
      const featured = featuredData ? JSON.parse(featuredData) : null;
      return new Response(
        JSON.stringify({ featured }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    if (method === "POST") {
      const { postId } = await request.json();
      if (!postId) {
        return new Response(
          JSON.stringify({ error: "Post ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const postsData = await env.BLOG_KV.get("blog:posts");
      if (!postsData) {
        return new Response(
          JSON.stringify({ error: "Posts not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      const posts = JSON.parse(postsData);
      const post = posts.find((p) => p.id === postId);
      if (!post) {
        return new Response(
          JSON.stringify({ error: "Post not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
      await env.BLOG_KV.put("blog:featured", JSON.stringify(post));
      return new Response(
        JSON.stringify({
          success: true,
          featured: post,
          message: "Post set as featured"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    if (method === "DELETE") {
      await env.BLOG_KV.delete("blog:featured");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Featured post removed"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Manage featured error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to manage featured post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(manageFeatured, "manageFeatured");

// src/handlers/menu.js
async function handleMenu(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;
  try {
    switch (action) {
      case "public":
      case "get":
        return await getMenu(request, env);
      case "update":
        return await updateMenu(request, env);
      case "add-item":
        return await addMenuItem(request, env);
      case "remove-item":
        return await removeMenuItem(request, env);
      case "reorder":
        return await reorderMenu(request, env);
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Menu handler error:", error);
    return new Response(
      JSON.stringify({ error: "Menu operation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleMenu, "handleMenu");
async function getMenu(request, env) {
  const url = new URL(request.url);
  const venue = url.searchParams.get("venue") || "farewell";
  const type = url.searchParams.get("type") || "drinks";
  try {
    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    if (!menuData) {
      const defaultMenu = getDefaultMenu(venue, type);
      return new Response(
        JSON.stringify({ menu: defaultMenu }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    const menu = JSON.parse(menuData);
    return new Response(
      JSON.stringify({ menu }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get menu error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch menu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getMenu, "getMenu");
async function updateMenu(request, env) {
  try {
    const menuData = await request.json();
    const { venue, type, menu } = menuData;
    if (!venue || !type || !menu) {
      return new Response(
        JSON.stringify({ error: "Venue, type, and menu data required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const menuKey = `menu:${venue}:${type}`;
    const menuWithMeta = {
      ...menu,
      venue,
      type,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      version: (menu.version || 0) + 1
    };
    await env.CONFIG_KV.put(menuKey, JSON.stringify(menuWithMeta));
    return new Response(
      JSON.stringify({
        success: true,
        menu: menuWithMeta,
        message: "Menu updated successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update menu error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update menu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(updateMenu, "updateMenu");
async function addMenuItem(request, env) {
  try {
    const itemData = await request.json();
    const { venue, type, category, item } = itemData;
    if (!venue || !type || !category || !item) {
      return new Response(
        JSON.stringify({ error: "Venue, type, category, and item data required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    let menu;
    if (menuData) {
      menu = JSON.parse(menuData);
    } else {
      menu = getDefaultMenu(venue, type);
    }
    if (!menu.categories) {
      menu.categories = {};
    }
    if (!menu.categories[category]) {
      menu.categories[category] = {
        name: category,
        items: [],
        order: Object.keys(menu.categories).length
      };
    }
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      created: (/* @__PURE__ */ new Date()).toISOString()
    };
    menu.categories[category].items.push(newItem);
    menu.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    menu.version = (menu.version || 0) + 1;
    await env.CONFIG_KV.put(menuKey, JSON.stringify(menu));
    return new Response(
      JSON.stringify({
        success: true,
        item: newItem,
        menu,
        message: "Menu item added successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Add menu item error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to add menu item" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(addMenuItem, "addMenuItem");
async function removeMenuItem(request, env) {
  try {
    const url = new URL(request.url);
    const venue = url.searchParams.get("venue");
    const type = url.searchParams.get("type");
    const category = url.searchParams.get("category");
    const itemId = url.searchParams.get("itemId");
    if (!venue || !type || !category || !itemId) {
      return new Response(
        JSON.stringify({ error: "Venue, type, category, and itemId required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    if (!menuData) {
      return new Response(
        JSON.stringify({ error: "Menu not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const menu = JSON.parse(menuData);
    if (!menu.categories || !menu.categories[category]) {
      return new Response(
        JSON.stringify({ error: "Category not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    menu.categories[category].items = menu.categories[category].items.filter(
      (item) => item.id !== itemId
    );
    menu.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    menu.version = (menu.version || 0) + 1;
    await env.CONFIG_KV.put(menuKey, JSON.stringify(menu));
    return new Response(
      JSON.stringify({
        success: true,
        menu,
        message: "Menu item removed successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Remove menu item error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to remove menu item" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(removeMenuItem, "removeMenuItem");
async function reorderMenu(request, env) {
  try {
    const reorderData = await request.json();
    const { venue, type, categoryOrder, itemOrders } = reorderData;
    if (!venue || !type) {
      return new Response(
        JSON.stringify({ error: "Venue and type required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    if (!menuData) {
      return new Response(
        JSON.stringify({ error: "Menu not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const menu = JSON.parse(menuData);
    if (categoryOrder && Array.isArray(categoryOrder)) {
      categoryOrder.forEach((categoryName, index) => {
        if (menu.categories[categoryName]) {
          menu.categories[categoryName].order = index;
        }
      });
    }
    if (itemOrders) {
      Object.entries(itemOrders).forEach(([categoryName, itemOrder]) => {
        if (menu.categories[categoryName] && Array.isArray(itemOrder)) {
          const reorderedItems = [];
          itemOrder.forEach((itemId) => {
            const item = menu.categories[categoryName].items.find((i) => i.id === itemId);
            if (item) {
              reorderedItems.push(item);
            }
          });
          menu.categories[categoryName].items = reorderedItems;
        }
      });
    }
    menu.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    menu.version = (menu.version || 0) + 1;
    await env.CONFIG_KV.put(menuKey, JSON.stringify(menu));
    return new Response(
      JSON.stringify({
        success: true,
        menu,
        message: "Menu reordered successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reorder menu error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reorder menu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(reorderMenu, "reorderMenu");
function getDefaultMenu(venue, type) {
  const baseMenu = {
    venue,
    type,
    categories: {},
    created: (/* @__PURE__ */ new Date()).toISOString(),
    version: 1
  };
  if (type === "drinks") {
    return {
      ...baseMenu,
      categories: {
        cocktails: {
          name: "Cocktails",
          order: 0,
          items: []
        },
        beer: {
          name: "Beer",
          order: 1,
          items: []
        },
        wine: {
          name: "Wine",
          order: 2,
          items: []
        },
        nonalcoholic: {
          name: "Non-Alcoholic",
          order: 3,
          items: [
            {
              id: "arizona-iced-tea",
              name: "AriZona Iced Tea",
              price: "$2.50",
              description: "Classic AriZona Iced Tea",
              available: true,
              order: 0
            }
          ]
        }
      }
    };
  }
  if (type === "food") {
    return {
      ...baseMenu,
      categories: {
        appetizers: {
          name: "Appetizers",
          order: 0,
          items: []
        },
        mains: {
          name: "Main Dishes",
          order: 1,
          items: []
        },
        desserts: {
          name: "Desserts",
          order: 2,
          items: []
        }
      }
    };
  }
  return baseMenu;
}
__name(getDefaultMenu, "getDefaultMenu");

// src/handlers/hours.js
async function handleHours(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;
  try {
    switch (action) {
      case "public":
      case "get":
        return await getHours(request, env);
      case "update":
        return await updateHours(request, env);
      case "set-special":
        return await setSpecialHours(request, env);
      case "remove-special":
        return await removeSpecialHours(request, env);
      case "set-closure":
        return await setClosure(request, env);
      case "remove-closure":
        return await removeClosure(request, env);
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Hours handler error:", error);
    return new Response(
      JSON.stringify({ error: "Hours operation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleHours, "handleHours");
async function getHours(request, env) {
  const url = new URL(request.url);
  const venue = url.searchParams.get("venue") || "farewell";
  const date = url.searchParams.get("date");
  const range = url.searchParams.get("range");
  try {
    const hoursKey = `hours:${venue}`;
    const hoursData = await env.CONFIG_KV.get(hoursKey);
    let hours;
    if (!hoursData) {
      hours = getDefaultHours(venue);
    } else {
      hours = JSON.parse(hoursData);
    }
    if (date) {
      const dateHours = calculateHoursForDate(hours, date);
      return new Response(
        JSON.stringify({
          venue,
          date,
          hours: dateHours,
          isOpen: isVenueOpen(dateHours),
          nextOpenTime: getNextOpenTime(hours, date)
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    if (range) {
      const rangeHours = calculateHoursForRange(hours, parseInt(range));
      return new Response(
        JSON.stringify({
          venue,
          range: parseInt(range),
          hours: rangeHours
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        venue,
        hours: hours.regular,
        specialHours: hours.special,
        closures: hours.closures,
        timezone: hours.timezone
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get hours error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch hours" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getHours, "getHours");
async function updateHours(request, env) {
  try {
    const hoursData = await request.json();
    const { venue, regular } = hoursData;
    if (!venue || !regular) {
      return new Response(
        JSON.stringify({ error: "Venue and regular hours required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    let hours;
    if (existingData) {
      hours = JSON.parse(existingData);
    } else {
      hours = getDefaultHours(venue);
    }
    hours.regular = {
      ...hours.regular,
      ...regular
    };
    hours.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    hours.version = (hours.version || 0) + 1;
    await env.CONFIG_KV.put(hoursKey, JSON.stringify(hours));
    return new Response(
      JSON.stringify({
        success: true,
        hours,
        message: "Operating hours updated successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update hours error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update hours" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(updateHours, "updateHours");
async function setSpecialHours(request, env) {
  try {
    const specialData = await request.json();
    const { venue, date, hours, reason } = specialData;
    if (!venue || !date || !hours) {
      return new Response(
        JSON.stringify({ error: "Venue, date, and hours required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    let venueHours;
    if (existingData) {
      venueHours = JSON.parse(existingData);
    } else {
      venueHours = getDefaultHours(venue);
    }
    if (!venueHours.special) {
      venueHours.special = {};
    }
    venueHours.special[date] = {
      open: hours.open,
      close: hours.close,
      reason: reason || "Special hours",
      created: (/* @__PURE__ */ new Date()).toISOString()
    };
    venueHours.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    venueHours.version = (venueHours.version || 0) + 1;
    await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));
    return new Response(
      JSON.stringify({
        success: true,
        specialHours: venueHours.special[date],
        message: "Special hours set successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Set special hours error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to set special hours" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(setSpecialHours, "setSpecialHours");
async function removeSpecialHours(request, env) {
  try {
    const url = new URL(request.url);
    const venue = url.searchParams.get("venue");
    const date = url.searchParams.get("date");
    if (!venue || !date) {
      return new Response(
        JSON.stringify({ error: "Venue and date required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: "Hours configuration not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const venueHours = JSON.parse(existingData);
    if (venueHours.special && venueHours.special[date]) {
      delete venueHours.special[date];
      venueHours.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      venueHours.version = (venueHours.version || 0) + 1;
      await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Special hours removed successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Remove special hours error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to remove special hours" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(removeSpecialHours, "removeSpecialHours");
async function setClosure(request, env) {
  try {
    const closureData = await request.json();
    const { venue, date, reason, allDay } = closureData;
    if (!venue || !date) {
      return new Response(
        JSON.stringify({ error: "Venue and date required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    let venueHours;
    if (existingData) {
      venueHours = JSON.parse(existingData);
    } else {
      venueHours = getDefaultHours(venue);
    }
    if (!venueHours.closures) {
      venueHours.closures = {};
    }
    venueHours.closures[date] = {
      reason: reason || "Closed",
      allDay: allDay !== false,
      // default to true
      created: (/* @__PURE__ */ new Date()).toISOString()
    };
    venueHours.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    venueHours.version = (venueHours.version || 0) + 1;
    await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));
    return new Response(
      JSON.stringify({
        success: true,
        closure: venueHours.closures[date],
        message: "Closure set successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Set closure error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to set closure" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(setClosure, "setClosure");
async function removeClosure(request, env) {
  try {
    const url = new URL(request.url);
    const venue = url.searchParams.get("venue");
    const date = url.searchParams.get("date");
    if (!venue || !date) {
      return new Response(
        JSON.stringify({ error: "Venue and date required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: "Hours configuration not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const venueHours = JSON.parse(existingData);
    if (venueHours.closures && venueHours.closures[date]) {
      delete venueHours.closures[date];
      venueHours.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      venueHours.version = (venueHours.version || 0) + 1;
      await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Closure removed successfully"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Remove closure error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to remove closure" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(removeClosure, "removeClosure");
function getDefaultHours(venue) {
  return {
    venue,
    timezone: "America/Chicago",
    regular: {
      monday: { open: "18:00", close: "02:00", closed: false },
      tuesday: { open: "18:00", close: "02:00", closed: false },
      wednesday: { open: "18:00", close: "02:00", closed: false },
      thursday: { open: "18:00", close: "02:00", closed: false },
      friday: { open: "18:00", close: "02:00", closed: false },
      saturday: { open: "18:00", close: "02:00", closed: false },
      sunday: { open: "18:00", close: "24:00", closed: false }
    },
    special: {},
    closures: {},
    created: (/* @__PURE__ */ new Date()).toISOString(),
    version: 1
  };
}
__name(getDefaultHours, "getDefaultHours");
function calculateHoursForDate(hours, dateString) {
  const date = new Date(dateString);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[date.getDay()];
  if (hours.closures && hours.closures[dateString]) {
    return {
      closed: true,
      reason: hours.closures[dateString].reason,
      type: "closure"
    };
  }
  if (hours.special && hours.special[dateString]) {
    return {
      closed: false,
      open: hours.special[dateString].open,
      close: hours.special[dateString].close,
      reason: hours.special[dateString].reason,
      type: "special"
    };
  }
  const dayHours = hours.regular[dayName];
  if (dayHours.closed) {
    return {
      closed: true,
      type: "regular"
    };
  }
  return {
    closed: false,
    open: dayHours.open,
    close: dayHours.close,
    type: "regular"
  };
}
__name(calculateHoursForDate, "calculateHoursForDate");
function calculateHoursForRange(hours, days) {
  const result = {};
  const today = /* @__PURE__ */ new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split("T")[0];
    result[dateString] = calculateHoursForDate(hours, dateString);
  }
  return result;
}
__name(calculateHoursForRange, "calculateHoursForRange");
function isVenueOpen(dayHours) {
  if (dayHours.closed) return false;
  const now = /* @__PURE__ */ new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}
__name(isVenueOpen, "isVenueOpen");
function getNextOpenTime(hours, fromDate) {
  const date = new Date(fromDate);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(date);
    checkDate.setDate(date.getDate() + i);
    const dateString = checkDate.toISOString().split("T")[0];
    const dayName = dayNames[checkDate.getDay()];
    const dayHours = calculateHoursForDate(hours, dateString);
    if (!dayHours.closed) {
      return {
        date: dateString,
        time: dayHours.open,
        day: dayName
      };
    }
  }
  return null;
}
__name(getNextOpenTime, "getNextOpenTime");

// src/handlers/admin.js
async function handleAdmin(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;
  switch (action) {
    case "auth":
      return handleAuth(request, env);
    case "dashboard":
      return handleDashboard(request, env);
    default:
      return new Response(
        JSON.stringify({ error: "Invalid admin action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
  }
}
__name(handleAdmin, "handleAdmin");
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path.includes("/login") && method === "POST") {
    return handleLogin(request, env);
  } else if (path.includes("/logout") && method === "POST") {
    return handleLogout(request, env);
  } else if (path.includes("/check") && method === "GET") {
    return handleAuthCheck(request, env);
  }
  return new Response(
    JSON.stringify({ error: "Invalid auth endpoint" }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
__name(handleAuth, "handleAuth");
async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const { username, password } = body;
    const validUsername = env.ADMIN_USERNAME || "admin";
    const validPassword = env.ADMIN_PASSWORD || "farewell2025";
    if (username === validUsername && password === validPassword) {
      const sessionToken = generateSessionToken();
      const sessionKey = `session:${sessionToken}`;
      await env.SESSIONS_KV?.put(sessionKey, JSON.stringify({
        username,
        created: Date.now(),
        expires: Date.now() + 24 * 60 * 60 * 1e3
        // 24 hours
      }), { expirationTtl: 24 * 60 * 60 });
      const response = new Response(
        JSON.stringify({ success: true, message: "Login successful" }),
        { headers: { "Content-Type": "application/json" } }
      );
      response.headers.set("Set-Cookie", `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`);
      return response;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Login failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleLogin, "handleLogin");
async function handleLogout(request, env) {
  try {
    const sessionToken = getSessionTokenFromRequest2(request);
    if (sessionToken) {
      const sessionKey = `session:${sessionToken}`;
      await env.SESSIONS_KV?.delete(sessionKey);
    }
    const response = new Response(
      JSON.stringify({ success: true, message: "Logout successful" }),
      { headers: { "Content-Type": "application/json" } }
    );
    response.headers.set("Set-Cookie", "session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(
      JSON.stringify({ error: "Logout failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleLogout, "handleLogout");
async function handleAuthCheck(request, env) {
  try {
    const sessionToken = getSessionTokenFromRequest2(request);
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.SESSIONS_KV?.get(sessionKey);
    if (!sessionData) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const session = JSON.parse(sessionData);
    if (session.expires < Date.now()) {
      await env.SESSIONS_KV?.delete(sessionKey);
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        authenticated: true,
        user: { username: session.username }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auth check error:", error);
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleAuthCheck, "handleAuthCheck");
async function handleDashboard(request, env) {
  try {
    const stats = {
      totalEvents: 0,
      upcomingEvents: 0,
      totalFlyers: 0,
      recentActivity: []
    };
    try {
      const eventsData = await env.EVENTS_KV?.get("events:all");
      if (eventsData) {
        const events = JSON.parse(eventsData);
        stats.totalEvents = events.length;
        stats.upcomingEvents = events.filter((e) => new Date(e.date) > /* @__PURE__ */ new Date()).length;
      }
    } catch (error) {
      console.error("Error loading event stats:", error);
    }
    return new Response(
      JSON.stringify(stats),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to load dashboard data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(handleDashboard, "handleDashboard");
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
__name(generateSessionToken, "generateSessionToken");
function getSessionTokenFromRequest2(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {});
  return cookies.session || null;
}
__name(getSessionTokenFromRequest2, "getSessionTokenFromRequest");

// src/handlers/migration.js
async function handleMigration(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  try {
    switch (action) {
      case "inspect":
        return await inspectAllDataSources(env);
      case "inspect-kv":
        return await inspectKVNamespaces(env);
      case "inspect-d1":
        return await inspectD1Databases(env);
      case "inspect-r2":
        return await inspectR2Buckets(env);
      case "migrate-blog":
        return await migrateBlogData(env);
      case "migrate-events":
        return await migrateEventData(env);
      case "migrate-gallery":
        return await migrateGalleryData(env);
      case "copy-r2":
        return await copyR2Data(env);
      default:
        return new Response(JSON.stringify({
          error: "Invalid action",
          availableActions: [
            "inspect",
            "inspect-kv",
            "inspect-d1",
            "inspect-r2",
            "migrate-blog",
            "migrate-events",
            "migrate-gallery",
            "copy-r2"
          ]
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({
      error: "Migration failed",
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleMigration, "handleMigration");
async function inspectAllDataSources(env) {
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    kvNamespaces: {},
    d1Databases: {},
    r2Buckets: {},
    summary: {}
  };
  const kvResults = await inspectKVNamespaces(env);
  const kvData = await kvResults.json();
  results.kvNamespaces = kvData.kvNamespaces;
  const d1Results = await inspectD1Databases(env);
  const d1Data = await d1Results.json();
  results.d1Databases = d1Data.d1Databases;
  const r2Results = await inspectR2Buckets(env);
  const r2Data = await r2Results.json();
  results.r2Buckets = r2Data.r2Buckets;
  results.summary = {
    kvNamespacesFound: Object.keys(results.kvNamespaces).length,
    d1DatabasesFound: Object.keys(results.d1Databases).length,
    r2BucketsFound: Object.keys(results.r2Buckets).length,
    totalDataSources: Object.keys(results.kvNamespaces).length + Object.keys(results.d1Databases).length + Object.keys(results.r2Buckets).length
  };
  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(inspectAllDataSources, "inspectAllDataSources");
async function inspectKVNamespaces(env) {
  const kvNamespaces = {
    // New unified namespaces
    EVENTS_KV: env.EVENTS_KV,
    SESSIONS_KV: env.SESSIONS_KV,
    GALLERY_KV: env.GALLERY_KV,
    BLOG_KV: env.BLOG_KV,
    CONFIG_KV: env.CONFIG_KV,
    // Legacy namespaces
    EVENTS_FAREWELL: env.EVENTS_FAREWELL,
    EVENTS_HOWDY: env.EVENTS_HOWDY,
    bl0wkv: env.bl0wkv,
    fff_kv: env.fff_kv
  };
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    kvNamespaces: {}
  };
  for (const [name, namespace] of Object.entries(kvNamespaces)) {
    if (!namespace) {
      results.kvNamespaces[name] = {
        available: false,
        error: "Namespace not bound"
      };
      continue;
    }
    try {
      const keyList = await namespace.list({ limit: 10 });
      const sampleKeys = keyList.keys || [];
      const sampleData = {};
      for (let i = 0; i < Math.min(3, sampleKeys.length); i++) {
        const key = sampleKeys[i];
        try {
          const value = await namespace.get(key.name);
          if (value) {
            let parsedValue = value;
            try {
              parsedValue = JSON.parse(value);
              if (typeof parsedValue === "object" && parsedValue !== null) {
                parsedValue = JSON.stringify(parsedValue, null, 2).substring(0, 500) + "...";
              }
            } catch (e) {
              parsedValue = value.substring(0, 500) + (value.length > 500 ? "..." : "");
            }
            sampleData[key.name] = parsedValue;
          }
        } catch (error) {
          sampleData[key.name] = `Error reading value: ${error.message}`;
        }
      }
      results.kvNamespaces[name] = {
        available: true,
        keyCount: keyList.keys?.length || 0,
        sampleKeys: sampleKeys.map((k) => ({ name: k.name, expiration: k.expiration })),
        sampleData
      };
    } catch (error) {
      results.kvNamespaces[name] = {
        available: false,
        error: error.message
      };
    }
  }
  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(inspectKVNamespaces, "inspectKVNamespaces");
async function inspectD1Databases(env) {
  const databases = {
    bl0wd1: env.bl0wd1,
    farewell_list: env.farewell_list,
    howdy_list: env.howdy_list,
    fwhygal0r3_db: env.fwhygal0r3_db
  };
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    d1Databases: {}
  };
  for (const [name, db] of Object.entries(databases)) {
    if (!db) {
      results.d1Databases[name] = {
        available: false,
        error: "Database not bound"
      };
      continue;
    }
    try {
      const tablesQuery = await db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();
      const tables = tablesQuery.results || [];
      const tableInfo = {};
      for (const table of tables.slice(0, 5)) {
        try {
          const countQuery = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first();
          const sampleQuery = await db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
          tableInfo[table.name] = {
            rowCount: countQuery?.count || 0,
            sampleRows: sampleQuery.results || []
          };
        } catch (error) {
          tableInfo[table.name] = {
            error: `Error accessing table: ${error.message}`
          };
        }
      }
      results.d1Databases[name] = {
        available: true,
        tableCount: tables.length,
        tables: tables.map((t) => t.name),
        tableInfo
      };
    } catch (error) {
      results.d1Databases[name] = {
        available: false,
        error: error.message
      };
    }
  }
  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(inspectD1Databases, "inspectD1Databases");
async function inspectR2Buckets(env) {
  const buckets = {
    R2_BUCKET: env.R2_BUCKET,
    NEW_BUCKET: env.NEW_BUCKET
  };
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    r2Buckets: {}
  };
  for (const [name, bucket] of Object.entries(buckets)) {
    if (!bucket) {
      results.r2Buckets[name] = {
        available: false,
        error: "Bucket not bound"
      };
      continue;
    }
    try {
      const objectList = await bucket.list({ limit: 20 });
      const objects = objectList.objects || [];
      results.r2Buckets[name] = {
        available: true,
        objectCount: objects.length,
        truncated: objectList.truncated || false,
        sampleObjects: objects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          modified: obj.uploaded?.toISOString(),
          etag: obj.etag
        }))
      };
    } catch (error) {
      results.r2Buckets[name] = {
        available: false,
        error: error.message
      };
    }
  }
  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(inspectR2Buckets, "inspectR2Buckets");
async function migrateBlogData(env) {
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    migrated: 0,
    errors: []
  };
  try {
    if (env.bl0wkv && env.BLOG_KV) {
      const keyList = await env.bl0wkv.list();
      for (const key of keyList.keys || []) {
        try {
          const value = await env.bl0wkv.get(key.name);
          if (value) {
            let blogData;
            try {
              blogData = JSON.parse(value);
            } catch (e) {
              blogData = { content: value, title: key.name };
            }
            const unifiedData = {
              id: key.name,
              title: blogData.title || key.name,
              content: blogData.content || value,
              author: blogData.author || "admin",
              published: blogData.published || true,
              createdAt: blogData.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
              tags: blogData.tags || [],
              venue: blogData.venue || "both"
            };
            await env.BLOG_KV.put(`blog:${key.name}`, JSON.stringify(unifiedData));
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating blog key ${key.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Blog migration error: ${error.message}`);
  }
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(migrateBlogData, "migrateBlogData");
async function migrateEventData(env) {
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    migrated: 0,
    errors: [],
    venues: { farewell: 0, howdy: 0 }
  };
  try {
    if (env.EVENTS_FAREWELL && env.EVENTS_KV) {
      const farewellKeys = await env.EVENTS_FAREWELL.list();
      for (const key of farewellKeys.keys || []) {
        try {
          const value = await env.EVENTS_FAREWELL.get(key.name);
          if (value) {
            let eventData;
            try {
              eventData = JSON.parse(value);
            } catch (e) {
              eventData = { content: value };
            }
            const unifiedData = {
              id: `farewell_${key.name}`,
              venue: "farewell",
              title: eventData.title || "Event",
              description: eventData.description || eventData.content || "",
              date: eventData.date || (/* @__PURE__ */ new Date()).toISOString(),
              time: eventData.time || "20:00",
              price: eventData.price || null,
              ticketLink: eventData.ticketLink || null,
              imageUrl: eventData.imageUrl || null,
              featured: eventData.featured || false,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            await env.EVENTS_KV.put(`event:farewell:${key.name}`, JSON.stringify(unifiedData));
            results.venues.farewell++;
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating farewell event ${key.name}: ${error.message}`);
        }
      }
    }
    if (env.EVENTS_HOWDY && env.EVENTS_KV) {
      const howdyKeys = await env.EVENTS_HOWDY.list();
      for (const key of howdyKeys.keys || []) {
        try {
          const value = await env.EVENTS_HOWDY.get(key.name);
          if (value) {
            let eventData;
            try {
              eventData = JSON.parse(value);
            } catch (e) {
              eventData = { content: value };
            }
            const unifiedData = {
              id: `howdy_${key.name}`,
              venue: "howdy",
              title: eventData.title || "Event",
              description: eventData.description || eventData.content || "",
              date: eventData.date || (/* @__PURE__ */ new Date()).toISOString(),
              time: eventData.time || "20:00",
              price: eventData.price || null,
              ticketLink: eventData.ticketLink || null,
              imageUrl: eventData.imageUrl || null,
              featured: eventData.featured || false,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            await env.EVENTS_KV.put(`event:howdy:${key.name}`, JSON.stringify(unifiedData));
            results.venues.howdy++;
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating howdy event ${key.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Event migration error: ${error.message}`);
  }
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(migrateEventData, "migrateEventData");
async function migrateGalleryData(env) {
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    migrated: 0,
    errors: []
  };
  try {
    if (env.fff_kv && env.GALLERY_KV) {
      const keyList = await env.fff_kv.list();
      for (const key of keyList.keys || []) {
        try {
          const value = await env.fff_kv.get(key.name);
          if (value) {
            let galleryData;
            try {
              galleryData = JSON.parse(value);
            } catch (e) {
              galleryData = { content: value };
            }
            const unifiedData = {
              id: key.name,
              venue: key.name.includes("howdy") ? "howdy" : "farewell",
              title: galleryData.title || "Gallery Item",
              description: galleryData.description || "",
              imageUrl: galleryData.imageUrl || galleryData.url || "",
              thumbnailUrl: galleryData.thumbnailUrl || null,
              category: galleryData.category || "flyer",
              featured: galleryData.featured || false,
              createdAt: galleryData.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            await env.GALLERY_KV.put(`gallery:${key.name}`, JSON.stringify(unifiedData));
            results.migrated++;
          }
        } catch (error) {
          results.errors.push(`Error migrating gallery key ${key.name}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Gallery migration error: ${error.message}`);
  }
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(migrateGalleryData, "migrateGalleryData");
async function copyR2Data(env) {
  const results = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    copied: 0,
    errors: [],
    note: "Copying from existing production bucket (fyg410r3) to new backup bucket (unified-assets-dev)"
  };
  try {
    if (env.R2_BUCKET && env.NEW_BUCKET) {
      let truncated = true;
      let cursor;
      while (truncated) {
        const listResult = await env.R2_BUCKET.list({
          limit: 100,
          cursor
        });
        for (const object of listResult.objects || []) {
          try {
            const sourceObject = await env.R2_BUCKET.get(object.key);
            if (sourceObject) {
              await env.NEW_BUCKET.put(object.key, sourceObject.body, {
                httpMetadata: sourceObject.httpMetadata,
                customMetadata: sourceObject.customMetadata
              });
              results.copied++;
            }
          } catch (error) {
            results.errors.push(`Error copying object ${object.key}: ${error.message}`);
          }
        }
        truncated = listResult.truncated;
        cursor = listResult.cursor;
      }
    }
  } catch (error) {
    results.errors.push(`R2 copy error: ${error.message}`);
  }
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(copyR2Data, "copyR2Data");

// src/index.js
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return handleCORS();
    }
    try {
      if (path.startsWith("/api/events/list")) {
        const eventsHandler = new EventsHandler(env);
        const response = await eventsHandler.handleRequest(request);
        return handleCORS(response);
      }
      if (path.startsWith("/api/blog/public")) {
        const response = await handleBlog(request, env, "public");
        return handleCORS(response);
      }
      if (path.startsWith("/api/menu/public")) {
        const response = await handleMenu(request, env, "public");
        return handleCORS(response);
      }
      if (path.startsWith("/api/hours/public")) {
        const response = await handleHours(request, env, "public");
        return handleCORS(response);
      }
      if (path.startsWith("/api/auth")) {
        const response = await handleAdmin(request, env, "auth");
        return handleCORS(response);
      }
      if (path === "/" || path === "/dashboard" || path === "/admin") {
        const authResult2 = await authenticate(request, env);
        if (!authResult2.success) {
          return Response.redirect("/login", 302);
        }
        try {
          const dashboardHTML = await fetch("https://raw.githubusercontent.com/thuruht/fwhyadmin/main/src/admin-dashboard.html");
          if (dashboardHTML.ok) {
            const html = await dashboardHTML.text();
            return new Response(html, {
              headers: { "Content-Type": "text/html" }
            });
          }
        } catch (error) {
          console.error("Error loading dashboard:", error);
        }
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 1200px; margin: 0 auto; }
              .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .btn { padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Farewell/Howdy Admin Dashboard</h1>
                <p>Welcome to the unified admin backend</p>
              </div>
              <div class="card">
                <h2>Quick Actions</h2>
                <a href="#" class="btn">Manage Events</a>
                <a href="#" class="btn">Upload Flyers</a>
                <a href="#" class="btn">Edit Menu</a>
                <a href="#" class="btn">Manage Hours</a>
              </div>
              <div class="card">
                <h2>System Status</h2>
                <p>Backend worker is running successfully.</p>
                <p>API endpoints are ready for frontend integration.</p>
              </div>
            </div>
          </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" }
        });
      }
      if (path === "/login") {
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Login</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
              .login-form { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 300px; }
              .login-form h2 { margin-bottom: 20px; text-align: center; color: #333; }
              .form-group { margin-bottom: 15px; }
              .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
              .form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
              .btn { width: 100%; padding: 10px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
              .btn:hover { background: #005a87; }
              .error { color: #dc3545; margin-top: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="login-form">
              <h2>Admin Login</h2>
              <form id="loginForm">
                <div class="form-group">
                  <label>Username</label>
                  <input type="text" id="username" required>
                </div>
                <div class="form-group">
                  <label>Password</label>
                  <input type="password" id="password" required>
                </div>
                <button type="submit" class="btn">Login</button>
                <div id="error" class="error" style="display: none;"></div>
              </form>
            </div>
            <script>
              document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('error');
                
                try {
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                  });
                  
                  if (response.ok) {
                    window.location.href = '/dashboard';
                  } else {
                    const error = await response.json();
                    errorDiv.textContent = error.message || 'Login failed';
                    errorDiv.style.display = 'block';
                  }
                } catch (error) {
                  errorDiv.textContent = 'Login failed. Please try again.';
                  errorDiv.style.display = 'block';
                }
              });
            <\/script>
          </body>
          </html>
        `, {
          headers: { "Content-Type": "text/html" }
        });
      }
      const authResult = await authenticate(request, env);
      if (!authResult.success) {
        return handleCORS(new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        ));
      }
      if (path.startsWith("/api/events")) {
        const eventsHandler = new EventsHandler(env);
        const response = await eventsHandler.handleRequest(request);
        return handleCORS(response);
      }
      if (path.startsWith("/api/gallery")) {
        const action = path.split("/")[3] || "list";
        const response = await handleGallery(request, env, action);
        return handleCORS(response);
      }
      if (path.startsWith("/api/blog")) {
        const action = path.split("/")[3] || "list";
        const response = await handleBlog(request, env, action);
        return handleCORS(response);
      }
      if (path.startsWith("/api/menu")) {
        const action = path.split("/")[3] || "get";
        const response = await handleMenu(request, env, action);
        return handleCORS(response);
      }
      if (path.startsWith("/api/hours")) {
        const action = path.split("/")[3] || "get";
        const response = await handleHours(request, env, action);
        return handleCORS(response);
      }
      if (path.startsWith("/api/admin")) {
        const action = path.split("/")[3] || "dashboard";
        const response = await handleAdmin(request, env, action);
        return handleCORS(response);
      }
      if (path.startsWith("/api/migrate")) {
        const authResult2 = await authenticate(request, env);
        if (!authResult2.success) {
          return handleCORS(new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          }));
        }
        const response = await handleMigration(request, env);
        return handleCORS(response);
      }
      return handleCORS(new Response(
        JSON.stringify({ error: "Not Found", requestedPath: path }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    } catch (error) {
      console.error("Worker error:", error);
      return handleCORS(new Response(
        JSON.stringify({ error: "Internal Server Error", details: error.message, requestedPath: path }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }
  }
};

// ../../../../../../usr/local/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../usr/local/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-r8iENX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../../../usr/local/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-r8iENX/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
