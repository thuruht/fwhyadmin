/**
 * Operating Hours Handler
 * Manages operating hours, special hours, and closures for both venues
 */

export async function handleHours(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    switch (action) {
      case 'public':
      case 'get':
        return await getHours(request, env);
      case 'update':
        return await updateHours(request, env);
      case 'set-special':
        return await setSpecialHours(request, env);
      case 'remove-special':
        return await removeSpecialHours(request, env);
      case 'set-closure':
        return await setClosure(request, env);
      case 'remove-closure':
        return await removeClosure(request, env);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Hours handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Hours operation failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getHours(request, env) {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') || 'farewell';
  const date = url.searchParams.get('date'); // YYYY-MM-DD format for specific date
  const range = url.searchParams.get('range'); // number of days to get

  try {
    const hoursKey = `hours:${venue}`;
    const hoursData = await env.CONFIG_KV.get(hoursKey);
    
    let hours;
    if (!hoursData) {
      hours = getDefaultHours(venue);
    } else {
      hours = JSON.parse(hoursData);
    }

    // If specific date requested, calculate hours for that date
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
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If range requested, get hours for multiple days
    if (range) {
      const rangeHours = calculateHoursForRange(hours, parseInt(range));
      return new Response(
        JSON.stringify({ 
          venue,
          range: parseInt(range),
          hours: rangeHours
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return full hours configuration
    return new Response(
      JSON.stringify({ 
        venue,
        hours: hours.regular,
        specialHours: hours.special,
        closures: hours.closures,
        timezone: hours.timezone
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get hours error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch hours' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function updateHours(request, env) {
  try {
    const hoursData = await request.json();
    const { venue, regular } = hoursData;

    if (!venue || !regular) {
      return new Response(
        JSON.stringify({ error: 'Venue and regular hours required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Update regular hours
    hours.regular = {
      ...hours.regular,
      ...regular
    };
    
    hours.lastUpdated = new Date().toISOString();
    hours.version = (hours.version || 0) + 1;

    await env.CONFIG_KV.put(hoursKey, JSON.stringify(hours));

    return new Response(
      JSON.stringify({ 
        success: true, 
        hours,
        message: 'Operating hours updated successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update hours error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update hours' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function setSpecialHours(request, env) {
  try {
    const specialData = await request.json();
    const { venue, date, hours, reason } = specialData;

    if (!venue || !date || !hours) {
      return new Response(
        JSON.stringify({ error: 'Venue, date, and hours required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Add special hours
    if (!venueHours.special) {
      venueHours.special = {};
    }

    venueHours.special[date] = {
      open: hours.open,
      close: hours.close,
      reason: reason || 'Special hours',
      created: new Date().toISOString()
    };
    
    venueHours.lastUpdated = new Date().toISOString();
    venueHours.version = (venueHours.version || 0) + 1;

    await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));

    return new Response(
      JSON.stringify({ 
        success: true, 
        specialHours: venueHours.special[date],
        message: 'Special hours set successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Set special hours error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set special hours' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function removeSpecialHours(request, env) {
  try {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue');
    const date = url.searchParams.get('date');

    if (!venue || !date) {
      return new Response(
        JSON.stringify({ error: 'Venue and date required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: 'Hours configuration not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const venueHours = JSON.parse(existingData);
    
    if (venueHours.special && venueHours.special[date]) {
      delete venueHours.special[date];
      
      venueHours.lastUpdated = new Date().toISOString();
      venueHours.version = (venueHours.version || 0) + 1;

      await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Special hours removed successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Remove special hours error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to remove special hours' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function setClosure(request, env) {
  try {
    const closureData = await request.json();
    const { venue, date, reason, allDay } = closureData;

    if (!venue || !date) {
      return new Response(
        JSON.stringify({ error: 'Venue and date required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Add closure
    if (!venueHours.closures) {
      venueHours.closures = {};
    }

    venueHours.closures[date] = {
      reason: reason || 'Closed',
      allDay: allDay !== false, // default to true
      created: new Date().toISOString()
    };
    
    venueHours.lastUpdated = new Date().toISOString();
    venueHours.version = (venueHours.version || 0) + 1;

    await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));

    return new Response(
      JSON.stringify({ 
        success: true, 
        closure: venueHours.closures[date],
        message: 'Closure set successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Set closure error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set closure' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function removeClosure(request, env) {
  try {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue');
    const date = url.searchParams.get('date');

    if (!venue || !date) {
      return new Response(
        JSON.stringify({ error: 'Venue and date required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hoursKey = `hours:${venue}`;
    const existingData = await env.CONFIG_KV.get(hoursKey);
    
    if (!existingData) {
      return new Response(
        JSON.stringify({ error: 'Hours configuration not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const venueHours = JSON.parse(existingData);
    
    if (venueHours.closures && venueHours.closures[date]) {
      delete venueHours.closures[date];
      
      venueHours.lastUpdated = new Date().toISOString();
      venueHours.version = (venueHours.version || 0) + 1;

      await env.CONFIG_KV.put(hoursKey, JSON.stringify(venueHours));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Closure removed successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Remove closure error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to remove closure' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getDefaultHours(venue) {
  return {
    venue,
    timezone: 'America/Chicago',
    regular: {
      monday: { open: '18:00', close: '02:00', closed: false },
      tuesday: { open: '18:00', close: '02:00', closed: false },
      wednesday: { open: '18:00', close: '02:00', closed: false },
      thursday: { open: '18:00', close: '02:00', closed: false },
      friday: { open: '18:00', close: '02:00', closed: false },
      saturday: { open: '18:00', close: '02:00', closed: false },
      sunday: { open: '18:00', close: '24:00', closed: false }
    },
    special: {},
    closures: {},
    created: new Date().toISOString(),
    version: 1
  };
}

function calculateHoursForDate(hours, dateString) {
  const date = new Date(dateString);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];

  // Check for closure first
  if (hours.closures && hours.closures[dateString]) {
    return {
      closed: true,
      reason: hours.closures[dateString].reason,
      type: 'closure'
    };
  }

  // Check for special hours
  if (hours.special && hours.special[dateString]) {
    return {
      closed: false,
      open: hours.special[dateString].open,
      close: hours.special[dateString].close,
      reason: hours.special[dateString].reason,
      type: 'special'
    };
  }

  // Use regular hours
  const dayHours = hours.regular[dayName];
  if (dayHours.closed) {
    return {
      closed: true,
      type: 'regular'
    };
  }

  return {
    closed: false,
    open: dayHours.open,
    close: dayHours.close,
    type: 'regular'
  };
}

function calculateHoursForRange(hours, days) {
  const result = {};
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    
    result[dateString] = calculateHoursForDate(hours, dateString);
  }
  
  return result;
}

function isVenueOpen(dayHours) {
  if (dayHours.closed) return false;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Simple time comparison (doesn't handle overnight hours properly)
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}

function getNextOpenTime(hours, fromDate) {
  // This is a simplified version - a full implementation would handle timezones,
  // overnight hours, and multiple days ahead
  const date = new Date(fromDate);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(date);
    checkDate.setDate(date.getDate() + i);
    const dateString = checkDate.toISOString().split('T')[0];
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
