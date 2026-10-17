// scripts/test-gmaps-scraper.mjs
// Verification script for Google Maps Hyper-Local Headless Browser Connector

import { googleMapsConnector } from '../lib/connectors/google_maps.js';
import { normalizer } from '../lib/services/normalizer.js';

console.log('================================================================');
console.log('🧪 TESTING GOOGLE MAPS HYPER-LOCAL CONNECTOR');
console.log('================================================================\n');

async function testGoogleMaps() {
  const startTime = Date.now();
  const testQuery = 'coffee shop in Brooklyn, NY';
  const testLimit = 3;

  console.log(`[TEST] Running hyper-local search for: "${testQuery}" (Limit: ${testLimit})...`);

  try {
    const rawLeads = await googleMapsConnector.search(testQuery, testLimit);

    console.log(`  -> Harvested ${rawLeads.length} leads from Google Maps`);

    if (rawLeads.length === 0) {
      throw new Error('Google Maps connector returned 0 results. Check network or selectors.');
    }

    let validCount = 0;
    for (let i = 0; i < rawLeads.length; i++) {
      const raw = rawLeads[i];
      const clean = normalizer.normalizeLead(raw);

      if (!clean.company_name) {
        throw new Error(`Record ${i + 1} is missing company_name`);
      }
      if (!clean.country) {
        throw new Error(`Record ${i + 1} is missing country`);
      }

      console.log(`\n  Lead #${i + 1}:`);
      console.log(`    🏢 Name    : ${clean.company_name}`);
      console.log(`    📍 Address : ${clean.address || 'N/A'}`);
      console.log(`    📞 Phone   : ${clean.phone || 'N/A'}`);
      console.log(`    🌐 Website : ${clean.website || 'N/A'}`);
      console.log(`    🏷️ Industry: ${clean.industry || 'N/A'}`);
      console.log(`    📌 Source  : ${clean.source}`);

      validCount++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n================================================================');
    console.log(`✅ GOOGLE MAPS CONNECTOR PASSED! (${validCount}/${rawLeads.length} validated in ${elapsed}s)`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Google Maps Connector Test Failed:', err.message);
    process.exit(1);
  }
}

testGoogleMaps();
