/**
 * Menu Handler
 * Manages drink menu and food menu for both venues
 */

export async function handleMenu(request, env, action) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    switch (action) {
      case 'public':
      case 'get':
        return await getMenu(request, env);
      case 'update':
        return await updateMenu(request, env);
      case 'add-item':
        return await addMenuItem(request, env);
      case 'remove-item':
        return await removeMenuItem(request, env);
      case 'reorder':
        return await reorderMenu(request, env);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Menu handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Menu operation failed' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function getMenu(request, env) {
  const url = new URL(request.url);
  const venue = url.searchParams.get('venue') || 'farewell';
  const type = url.searchParams.get('type') || 'drinks'; // drinks, food, specials

  try {
    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    
    if (!menuData) {
      // Return default menu structure
      const defaultMenu = getDefaultMenu(venue, type);
      return new Response(
        JSON.stringify({ menu: defaultMenu }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const menu = JSON.parse(menuData);
    
    return new Response(
      JSON.stringify({ menu }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get menu error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch menu' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function updateMenu(request, env) {
  try {
    const menuData = await request.json();
    const { venue, type, menu } = menuData;

    if (!venue || !type || !menu) {
      return new Response(
        JSON.stringify({ error: 'Venue, type, and menu data required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const menuKey = `menu:${venue}:${type}`;
    
    // Add metadata
    const menuWithMeta = {
      ...menu,
      venue,
      type,
      lastUpdated: new Date().toISOString(),
      version: (menu.version || 0) + 1
    };

    await env.CONFIG_KV.put(menuKey, JSON.stringify(menuWithMeta));

    return new Response(
      JSON.stringify({ 
        success: true, 
        menu: menuWithMeta,
        message: 'Menu updated successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update menu error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update menu' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function addMenuItem(request, env) {
  try {
    const itemData = await request.json();
    const { venue, type, category, item } = itemData;

    if (!venue || !type || !category || !item) {
      return new Response(
        JSON.stringify({ error: 'Venue, type, category, and item data required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Add item to category
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

    // Add unique ID to item
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      created: new Date().toISOString()
    };

    menu.categories[category].items.push(newItem);
    menu.lastUpdated = new Date().toISOString();
    menu.version = (menu.version || 0) + 1;

    await env.CONFIG_KV.put(menuKey, JSON.stringify(menu));

    return new Response(
      JSON.stringify({ 
        success: true, 
        item: newItem,
        menu,
        message: 'Menu item added successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Add menu item error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to add menu item' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function removeMenuItem(request, env) {
  try {
    const url = new URL(request.url);
    const venue = url.searchParams.get('venue');
    const type = url.searchParams.get('type');
    const category = url.searchParams.get('category');
    const itemId = url.searchParams.get('itemId');

    if (!venue || !type || !category || !itemId) {
      return new Response(
        JSON.stringify({ error: 'Venue, type, category, and itemId required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    
    if (!menuData) {
      return new Response(
        JSON.stringify({ error: 'Menu not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const menu = JSON.parse(menuData);
    
    if (!menu.categories || !menu.categories[category]) {
      return new Response(
        JSON.stringify({ error: 'Category not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Remove item
    menu.categories[category].items = menu.categories[category].items.filter(
      item => item.id !== itemId
    );

    menu.lastUpdated = new Date().toISOString();
    menu.version = (menu.version || 0) + 1;

    await env.CONFIG_KV.put(menuKey, JSON.stringify(menu));

    return new Response(
      JSON.stringify({ 
        success: true, 
        menu,
        message: 'Menu item removed successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Remove menu item error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to remove menu item' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function reorderMenu(request, env) {
  try {
    const reorderData = await request.json();
    const { venue, type, categoryOrder, itemOrders } = reorderData;

    if (!venue || !type) {
      return new Response(
        JSON.stringify({ error: 'Venue and type required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const menuKey = `menu:${venue}:${type}`;
    const menuData = await env.CONFIG_KV.get(menuKey);
    
    if (!menuData) {
      return new Response(
        JSON.stringify({ error: 'Menu not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const menu = JSON.parse(menuData);

    // Update category order
    if (categoryOrder && Array.isArray(categoryOrder)) {
      categoryOrder.forEach((categoryName, index) => {
        if (menu.categories[categoryName]) {
          menu.categories[categoryName].order = index;
        }
      });
    }

    // Update item orders within categories
    if (itemOrders) {
      Object.entries(itemOrders).forEach(([categoryName, itemOrder]) => {
        if (menu.categories[categoryName] && Array.isArray(itemOrder)) {
          // Reorder items based on provided order
          const reorderedItems = [];
          itemOrder.forEach(itemId => {
            const item = menu.categories[categoryName].items.find(i => i.id === itemId);
            if (item) {
              reorderedItems.push(item);
            }
          });
          menu.categories[categoryName].items = reorderedItems;
        }
      });
    }

    menu.lastUpdated = new Date().toISOString();
    menu.version = (menu.version || 0) + 1;

    await env.CONFIG_KV.put(menuKey, JSON.stringify(menu));

    return new Response(
      JSON.stringify({ 
        success: true, 
        menu,
        message: 'Menu reordered successfully' 
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reorder menu error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to reorder menu' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getDefaultMenu(venue, type) {
  const baseMenu = {
    venue,
    type,
    categories: {},
    created: new Date().toISOString(),
    version: 1
  };

  if (type === 'drinks') {
    return {
      ...baseMenu,
      categories: {
        cocktails: {
          name: 'Cocktails',
          order: 0,
          items: []
        },
        beer: {
          name: 'Beer',
          order: 1,
          items: []
        },
        wine: {
          name: 'Wine',
          order: 2,
          items: []
        },
        nonalcoholic: {
          name: 'Non-Alcoholic',
          order: 3,
          items: [
            {
              id: 'arizona-iced-tea',
              name: 'AriZona Iced Tea',
              price: '$2.50',
              description: 'Classic AriZona Iced Tea',
              available: true,
              order: 0
            }
          ]
        }
      }
    };
  }

  if (type === 'food') {
    return {
      ...baseMenu,
      categories: {
        appetizers: {
          name: 'Appetizers',
          order: 0,
          items: []
        },
        mains: {
          name: 'Main Dishes',
          order: 1,
          items: []
        },
        desserts: {
          name: 'Desserts',
          order: 2,
          items: []
        }
      }
    };
  }

  return baseMenu;
}
