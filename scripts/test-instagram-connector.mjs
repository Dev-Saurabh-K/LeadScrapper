// scripts/test-instagram-connector.mjs
// Automated verification suite for Authless Instagram Leads Scraper

import { getConnector, CONNECTORS } from '../lib/connectors/index.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';
import fs from 'fs';

async function runSuite() {
  console.log('\n================================================================');
  console.log('📸 RUNNING INSTAGRAM AUTHLESS CONNECTOR VERIFICATION SUITE');
  console.log('================================================================\n');

  // TEST 1: Registry verification
  console.log('[TEST 1] Testing Connector Registry...');
  const igConnector = getConnector('INSTAGRAM');
  if (!igConnector || igConnector.code !== 'INSTAGRAM') {
    throw new Error('getConnector("INSTAGRAM") failed to return InstagramConnector instance');
  }
  if (!CONNECTORS.INSTAGRAM) {
    throw new Error('CONNECTORS.INSTAGRAM is not registered in index.js');
  }
  console.log('  -> Registry correctly mapped: "INSTAGRAM" ->', igConnector.registryName);
  console.log('  ✅ Connector Registry passed!\n');

  // TEST 2: Query Synthesis
  console.log('[TEST 2] Testing X-Ray Query Builder...');
  const query1 = igConnector.buildXRayQuery({ category: 'Fitness Coach', location: 'Miami', bioIntent: 'DM for Collabs' });
  const query2 = igConnector.buildXRayQuery('boutique bakery Brooklyn hello@');
  if (!query1.includes('site:instagram.com') || !query1.includes('Fitness Coach') || !query1.includes('Miami')) {
    throw new Error(`Invalid structured query built: ${query1}`);
  }
  if (!query2.includes('site:instagram.com') || !query2.includes('boutique bakery')) {
    throw new Error(`Invalid raw query built: ${query2}`);
  }
  console.log('  -> Query 1 (Structured):', query1);
  console.log('  -> Query 2 (Raw):', query2);
  console.log('  ✅ Query Builder passed!\n');

  // TEST 3: URL Validation & Normalization
  console.log('[TEST 3] Testing URL Validation & Normalization...');
  const validUrl = 'https://www.instagram.com/mfitnessmiami/?hl=en#posts';
  const cleanUrl = igConnector.normalizeProfileUrl(validUrl);
  if (cleanUrl !== 'https://www.instagram.com/mfitnessmiami') {
    throw new Error(`URL normalization failed. Expected "https://www.instagram.com/mfitnessmiami", got "${cleanUrl}"`);
  }
  if (!igConnector.isProfileUrl(cleanUrl)) {
    throw new Error(`Expected isProfileUrl to accept "${cleanUrl}"`);
  }

  // Reject non-profile paths
  const invalidUrls = [
    'https://www.instagram.com/p/C_abc12345/',
    'https://www.instagram.com/reel/D_xyz987/',
    'https://www.instagram.com/stories/highlights/123/',
    'https://www.instagram.com/explore/',
    'https://www.instagram.com/accounts/login/'
  ];
  for (const inv of invalidUrls) {
    if (igConnector.isProfileUrl(inv)) {
      throw new Error(`isProfileUrl incorrectly allowed non-profile URL: ${inv}`);
    }
  }
  console.log('  -> Normalized:', validUrl, '->', cleanUrl);
  console.log('  -> Correctly rejected post, reel, story, explore, and account URLs');
  console.log('  ✅ URL Validation & Normalization passed!\n');

  // TEST 4: Snippet Parsing & Deobfuscation
  console.log('[TEST 4] Testing Snippet Parsing & Contact Extraction...');
  const mockTitle = 'Miami Fitness Club (@miamifitnessclub) • Instagram photos and videos';
  const mockUrl = 'https://www.instagram.com/miamifitnessclub/';
  const mockSnippet = '5,420 Followers, 890 Following, 340 Posts - Official Miami Fitness. 📍 South Beach, Miami. Call us 786-555-0199 or email info [at] miamifitness [dot] com. Bookings at miamifitness.com';
  const parsed = igConnector.parseProfileFromSnippet(mockTitle, mockUrl, mockSnippet);

  if (!parsed || parsed.director !== '@miamifitnessclub') {
    throw new Error('Failed to parse Instagram handle from title');
  }
  if (parsed.company_name !== 'Miami Fitness Club') {
    throw new Error(`Failed to parse display name. Got: ${parsed.company_name}`);
  }
  if (parsed.email !== 'info@miamifitness.com') {
    throw new Error(`Failed to deobfuscate and extract email. Got: ${parsed.email}`);
  }
  if (!parsed.phone) {
    throw new Error('Failed to extract phone number from snippet');
  }
  if (parsed.registration_number !== 'IG:miamifitnessclub') {
    throw new Error(`Unexpected registration number: ${parsed.registration_number}`);
  }
  if (parsed.company_domain !== 'https://miamifitness.com') {
    throw new Error(`Failed to extract external domain for enrichment. Got: ${parsed.company_domain}`);
  }
  console.log(`  -> Name: "${parsed.company_name}" | Handle: ${parsed.director} | Email: ${parsed.email} | Phone: ${parsed.phone}`);
  console.log(`  -> Bio Website: ${parsed.company_domain} | Reg ID: ${parsed.registration_number}`);
  console.log('  ✅ Snippet Parsing passed!\n');

  // TEST 5: Live Authless Profile Extraction
  console.log('[TEST 5] Testing Live Instagram Authless Scraper (Harvest 2 profiles)...');
  const rawProfiles = await igConnector.search({ category: 'fitness', location: 'Miami' }, 2);
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    throw new Error('No Instagram profiles harvested from live search');
  }
  console.log(`  -> Harvested ${rawProfiles.length} live Instagram profiles`);
  const sample = rawProfiles[0];
  console.log(`  -> Sample Profile: "${sample.company_name}" (${sample.director})`);
  console.log(`  -> Profile URL: ${sample.website}`);
  if (!sample.director || !sample.website.includes('instagram.com/')) {
    throw new Error('Sample lead missing required Handle or Instagram URL');
  }
  console.log('  ✅ Live Authless Scraper passed!\n');

  // TEST 6: Normalization & Schema Compliance
  console.log('[TEST 6] Testing Normalization & Schema Validation...');
  const cleanLead = normalizer.normalizeLead(sample);
  if (!cleanLead.company_name || !cleanLead.director || !cleanLead.source.includes('Instagram')) {
    throw new Error('Normalized lead missing required fields or incorrect source');
  }
  console.log('  -> Normalized lead source:', cleanLead.source);
  console.log('  -> Lead ID / Reg:', cleanLead.registration_number);
  console.log('  ✅ Normalizer passed!\n');

  // TEST 7: Database Persistence & Deduplication
  console.log('[TEST 7] Testing Database Persistence & Deduplication...');
  await db.insertLead(cleanLead);
  const dupCheck = await normalizer.checkDuplicate(cleanLead);
  if (!dupCheck.isDuplicate) {
    throw new Error('Deduplication check failed to detect recently inserted Instagram lead');
  }
  console.log('  -> Successfully detected duplicate for registration handle:', cleanLead.registration_number);
  console.log('  ✅ Deduplication passed!\n');

  // TEST 8: Excel Workbook Generation
  console.log('[TEST 8] Testing Master_B2B_Leads.xlsx Generation...');
  const excelResult = await exporter.generateMasterExcel();
  if (!fs.existsSync(excelResult.filePath)) {
    throw new Error(`Master Excel file not found at: ${excelResult.filePath}`);
  }
  console.log(`  -> File created at: ${excelResult.filePath} (${excelResult.buffer.length} bytes, ${excelResult.count} leads)`);
  console.log('  ✅ Excel Export passed!\n');

  console.log('================================================================');
  console.log('SUMMARY: 8/8 Instagram Tests Passed successfully!');
  console.log('================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ Instagram Test Suite Error:', err.message);
  process.exit(1);
});
