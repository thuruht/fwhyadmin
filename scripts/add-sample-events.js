// Add sample events for testing
const sampleEvents = [
  {
    id: 'event-1',
    title: 'Farewell Live Music Night',
    date: '2025-06-20',
    time: '20:00',
    venue: 'farewell',
    description: 'Live music featuring local bands at Farewell Cafe',
    suggested_price: '$10',
    ticket_url: '',
    age_restriction: '21+',
    order: 1,
    flyer_url: '/img/placeholder.png',
    thumbnail_url: '/img/placeholder.png',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'event-2',
    title: 'Howdy Open Mic',
    date: '2025-06-22',
    time: '19:00',
    venue: 'howdy',
    description: 'Open mic night at Howdy - bring your instruments!',
    suggested_price: '$5',
    ticket_url: '',
    age_restriction: '',
    order: 2,
    flyer_url: '/img/placeholder.png',
    thumbnail_url: '/img/placeholder.png',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'event-3',
    title: 'Both Venues Comedy Night',
    date: '2025-06-25',
    time: '21:00',
    venue: 'other',
    description: 'Comedy show happening at both Farewell and Howdy',
    suggested_price: '$15',
    ticket_url: 'https://example.com/tickets',
    age_restriction: '18+',
    order: 3,
    flyer_url: '/img/placeholder.png',
    thumbnail_url: '/img/placeholder.png',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

console.log('Sample events to add via KV:');
console.log(JSON.stringify(sampleEvents, null, 2));
