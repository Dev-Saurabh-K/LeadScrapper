// lib/data/geo_locations.js
// Curated geographic database of countries, top commercial metropolitan cities, and Google Maps query synthesizer

export const GEO_COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    cities: [
      'Kolkata',
      'Mumbai',
      'Delhi / NCR',
      'Bangalore',
      'Hyderabad',
      'Chennai',
      'Pune',
      'Ahmedabad',
      'Jaipur',
      'Surat',
      'Lucknow',
      'Chandigarh',
      'Indore',
      'Kochi',
      'Patna',
      'Bhubaneswar',
      'Guwahati',
      'Coimbatore'
    ]
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    cities: [
      'New York',
      'Los Angeles',
      'Chicago',
      'Houston',
      'Phoenix',
      'Philadelphia',
      'San Antonio',
      'San Diego',
      'Dallas',
      'Austin',
      'San Francisco',
      'Seattle',
      'Miami',
      'Atlanta',
      'Boston',
      'Denver',
      'Las Vegas',
      'Orlando',
      'Portland',
      'Charlotte'
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    cities: [
      'London',
      'Manchester',
      'Birmingham',
      'Leeds',
      'Glasgow',
      'Liverpool',
      'Edinburgh',
      'Bristol',
      'Sheffield',
      'Newcastle',
      'Belfast',
      'Cardiff'
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    cities: [
      'Toronto',
      'Montreal',
      'Vancouver',
      'Calgary',
      'Edmonton',
      'Ottawa',
      'Winnipeg',
      'Quebec City',
      'Hamilton',
      'Kitchener'
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    cities: [
      'Sydney',
      'Melbourne',
      'Brisbane',
      'Perth',
      'Adelaide',
      'Gold Coast',
      'Canberra',
      'Newcastle',
      'Wollongong',
      'Hobart'
    ]
  },
  {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    cities: [
      'Singapore Central',
      'Jurong',
      'Woodlands',
      'Tampines',
      'Bedok',
      'Orchard',
      'Marina Bay',
      'Kallang',
      'Ang Mo Kio'
    ]
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    cities: [
      'Paris',
      'Marseille',
      'Lyon',
      'Toulouse',
      'Nice',
      'Nantes',
      'Strasbourg',
      'Montpellier',
      'Bordeaux',
      'Lille',
      'Rennes',
      'Reims'
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    cities: [
      'Berlin',
      'Munich',
      'Hamburg',
      'Frankfurt',
      'Cologne',
      'Stuttgart',
      'Düsseldorf',
      'Leipzig',
      'Dortmund',
      'Dresden'
    ]
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    cities: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Fujairah',
      'Al Ain'
    ]
  },
  {
    code: 'NO',
    name: 'Norway',
    flag: '🇳🇴',
    cities: [
      'Oslo',
      'Bergen',
      'Trondheim',
      'Stavanger',
      'Drammen',
      'Kristiansand',
      'Tromsø',
      'Sandnes'
    ]
  },
  {
    code: 'CUSTOM',
    name: 'Other / Custom Location',
    flag: '🌍',
    cities: ['Custom City']
  }
];

export const POPULAR_NICHES = [
  { label: 'School', query: 'school' },
  { label: 'Dentist', query: 'dentist' },
  { label: 'Plumber', query: 'plumber' },
  { label: 'Restaurant', query: 'restaurant' },
  { label: 'Real Estate', query: 'real estate agency' },
  { label: 'Salon & Spa', query: 'beauty salon' },
  { label: 'Software / IT', query: 'software company' },
  { label: 'Fitness / Gym', query: 'gym' }
];

/**
 * Builds an optimized Google Maps hyper-local search query string
 * @param {object} params
 * @param {string} params.category - Business category (e.g. "school", "plumber")
 * @param {string} [params.locality] - Specific neighborhood, suburb, or street (e.g. "Manhattan", "Brooklyn", "Camden")
 * @param {string} [params.city] - Target metropolitan city (e.g. "New York", "London")
 * @param {string} [params.country] - Target country name (e.g. "United States", "United Kingdom")
 * @returns {string} Formatted query string (e.g. "school in Manhattan, New York, United States")
 */
export function buildMapsQuery({ category = '', locality = '', city = '', country = '' }) {
  const cleanCat = (category || '').trim();
  const locParts = [locality, city, country]
    .map(p => (p || '').trim())
    .filter(p => p && p !== 'Custom City' && p !== 'Other / Custom Location');

  const locString = locParts.join(', ');

  if (cleanCat && locString) {
    return `${cleanCat} in ${locString}`;
  }
  if (cleanCat) {
    return cleanCat;
  }
  return locString;
}
