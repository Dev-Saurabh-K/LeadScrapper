// scripts/test-geo-query.mjs
// Test suite for Google Maps hyper-local query synthesizer and geo locations database

import { GEO_COUNTRIES, buildMapsQuery, POPULAR_NICHES } from '../lib/data/geo_locations.js';

console.log('================================================================');
console.log('🧪 TESTING GEO LOCATIONS & GOOGLE MAPS QUERY SYNTHESIZER');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assertEqual(actual, expected, testName) {
  total++;
  if (actual === expected) {
    console.log(`✅ [PASS] ${testName}: "${actual}"`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`     Expected: "${expected}"`);
    console.error(`     Actual  : "${actual}"`);
  }
}

// 1. Full Hyper-Local (Category + Locality + City + Country)
assertEqual(
  buildMapsQuery({ category: 'school', locality: 'Nayabad', city: 'Kolkata', country: 'India' }),
  'school in Nayabad, Kolkata, India',
  'Full hyper-local query with neighborhood'
);

// 2. City + Country without Locality
assertEqual(
  buildMapsQuery({ category: 'plumber', locality: '', city: 'Brooklyn', country: 'United States' }),
  'plumber in Brooklyn, United States',
  'City and country without neighborhood'
);

// 3. Category + City only
assertEqual(
  buildMapsQuery({ category: 'dentist', locality: '', city: 'London', country: '' }),
  'dentist in London',
  'Category and city only'
);

// 4. Locality + City only
assertEqual(
  buildMapsQuery({ category: 'cafe', locality: 'Indiranagar', city: 'Bangalore', country: '' }),
  'cafe in Indiranagar, Bangalore',
  'Category with locality and city'
);

// 5. Custom / Fallback Handling
assertEqual(
  buildMapsQuery({ category: 'hospital', locality: 'Downtown', city: 'Custom City', country: 'Other / Custom Location' }),
  'hospital in Downtown',
  'Filters out placeholder Custom City labels'
);

// 6. Dataset integrity verification
total++;
if (GEO_COUNTRIES.length >= 10) {
  console.log(`✅ [PASS] Loaded ${GEO_COUNTRIES.length} countries in geographic dataset`);
  passed++;
} else {
  console.error(`❌ [FAIL] Insufficient countries loaded: ${GEO_COUNTRIES.length}`);
}

total++;
if (POPULAR_NICHES.length >= 6) {
  console.log(`✅ [PASS] Loaded ${POPULAR_NICHES.length} popular business niches`);
  passed++;
} else {
  console.error(`❌ [FAIL] Insufficient niches loaded`);
}

console.log('\n================================================================');
console.log(`SUMMARY: ${passed}/${total} Tests Passed`);
console.log('================================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
