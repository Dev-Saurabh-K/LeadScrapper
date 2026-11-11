// scripts/test-facebook-connector.mjs
// Automated verification suite for Authless Facebook Leads Scraper

import { getConnector, CONNECTORS } from '../lib/connectors/index.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';
import fs from 'fs';

async function runSuite() {
  console.log('\n================================================================');
  console.log('📘 RUNNING FACEBOOK AUTHLESS CONNECTOR VERIFICATION SUITE');
  console.log('================================================================\n');

  // TEST 1: Registry verification
  console.log('[TEST 1] Testing Connector Registry...');
  const fbConnector = getConnector('FACEBOOK');
  if (!fbConnector || fbConnector.code !== 'FACEBOOK') {
    throw new Error('getConnector("FACEBOOK") failed to return FacebookConnector instance');
  }
  if (!CONNECTORS.FACEBOOK) {
    throw new Error('CONNECTORS.FACEBOOK is not registered in index.js');
  }
  const fbAlias = getConnector('FB');
  if (!fbAlias || fbAlias.code !== 'FACEBOOK') {
    throw new Error('getConnector("FB") alias failed to resolve');
  }
  console.log('  -> Registry correctly mapped: "FACEBOOK" ->', fbConnector.registryName);
  console.log('  -> Alias "FB" successfully resolved');
  console.log('  ✅ Connector Registry passed!\n');

  // TEST 2: Query Synthesis
  console.log('[TEST 2] Testing X-Ray Query Builder...');
  const query1 = fbConnector.buildXRayQuery({ category: 'Restaurant Cafe', location: 'Miami Beach', bioIntent: 'Call Now' });
  const query2 = fbConnector.buildXRayQuery('boutique bakery Brooklyn phone');
  if (!query1.includes('site:facebook.com') || !query1.includes('Restaurant Cafe') || !query1.includes('Miami Beach') || !query1.includes('-inurl:groups')) {
    throw new Error(`Invalid structured query built: ${query1}`);
  }
  if (!query2.includes('site:facebook.com') || !query2.includes('boutique bakery') || !query2.includes('-inurl:groups')) {
    throw new Error(`Invalid raw query built: ${query2}`);
  }
  console.log('  -> Query 1 (Structured):', query1);
  console.log('  -> Query 2 (Raw):', query2);
  console.log('  ✅ Query Builder passed!\n');

  // TEST 3: URL Validation & Normalization
  console.log('[TEST 3] Testing URL Validation & Normalization...');
  const validUrl = 'https://m.facebook.com/MiasBakeryBK/?ref=page_internal#about';
  const cleanUrl = fbConnector.normalizeProfileUrl(validUrl);
  if (cleanUrl !== 'https://www.facebook.com/MiasBakeryBK') {
    throw new Error(`URL normalization failed. Expected "https://www.facebook.com/MiasBakeryBK", got "${cleanUrl}"`);
  }
  if (!fbConnector.isProfileUrl(cleanUrl)) {
    throw new Error(`Expected isProfileUrl to accept "${cleanUrl}"`);
  }

  // Reject non-lead subpaths (groups, posts, reels, events, etc.)
  const invalidUrls = [
    'https://www.facebook.com/groups/miamitechcommunity/',
    'https://www.facebook.com/post/1234567890/',
    'https://www.facebook.com/reel/9876543210/',
    'https://www.facebook.com/events/555123456/',
    'https://www.facebook.com/photo/?fbid=12345',
    'https://www.facebook.com/help/12345',
    'https://www.facebook.com/marketplace/'
  ];
  for (const inv of invalidUrls) {
    if (fbConnector.isProfileUrl(inv)) {
      throw new Error(`isProfileUrl incorrectly allowed non-profile URL: ${inv}`);
    }
  }
  console.log('  -> Normalized:', validUrl, '->', cleanUrl);
  console.log('  -> Correctly rejected group, post, reel, event, photo, and help URLs');
  console.log('  ✅ URL Validation & Normalization passed!\n');

  // TEST 4: Snippet Parsing & Contact Extraction
  console.log('[TEST 4] Testing Snippet Parsing & Contact Extraction...');
  const mockTitle = "Mia's Brooklyn Bakery | Brooklyn NY - Facebook";
  const mockUrl = 'https://www.facebook.com/miasbrooklynbakery/';
  const mockSnippet = '5,022 followers · 81 talking about this · 4,579 were here. 📍 139 Smith St, Brooklyn, NY, United States, 11201. Call us at (718) 987-6543 or email contact [at] miasbakerybk [dot] com. Visit miasbakery.com';
  const parsed = fbConnector.parseProfileFromSnippet(mockTitle, mockUrl, mockSnippet);

  if (!parsed) {
    throw new Error('Failed to parse snippet');
  }
  if (parsed.company_name !== "Mia's Brooklyn Bakery") {
    throw new Error(`Failed to parse display name. Got: ${parsed.company_name}`);
  }
  if (parsed.email !== 'contact@miasbakerybk.com') {
    throw new Error(`Failed to deobfuscate and extract email. Got: ${parsed.email}`);
  }
  if (!parsed.phone) {
    throw new Error('Failed to extract phone number from snippet');
  }
  if (parsed.registration_number !== 'FB:miasbrooklynbakery') {
    throw new Error(`Unexpected registration number: ${parsed.registration_number}`);
  }
  if (parsed.postal_code !== '11201') {
    throw new Error(`Failed to extract postal code. Got: ${parsed.postal_code}`);
  }
  if (parsed.company_domain !== 'https://miasbakery.com') {
    throw new Error(`Failed to extract external domain for enrichment. Got: ${parsed.company_domain}`);
  }
  console.log(`  -> Name: "${parsed.company_name}" | Email: ${parsed.email} | Phone: ${parsed.phone}`);
  console.log(`  -> Address: "${parsed.address}" | Postal: ${parsed.postal_code}`);
  console.log(`  -> Bio Website: ${parsed.company_domain} | Reg ID: ${parsed.registration_number}`);
  console.log('  ✅ Snippet Parsing passed!\n');

  // TEST 5: Live Authless Profile Extraction
  console.log('[TEST 5] Testing Live Facebook Authless Scraper (Harvest 2 pages)...');
  const rawProfiles = await fbConnector.search({ category: 'bakery', location: 'Brooklyn' }, 2);
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    throw new Error('No Facebook pages harvested from live search');
  }
  console.log(`  -> Harvested ${rawProfiles.length} live Facebook business pages`);
  const sample = rawProfiles[0];
  console.log(`  -> Sample Page: "${sample.company_name}"`);
  console.log(`  -> Page URL: ${sample.website}`);
  if (!sample.company_name || !sample.website.includes('facebook.com/')) {
    throw new Error('Sample lead missing required company name or Facebook URL');
  }
  console.log('  ✅ Live Authless Scraper passed!\n');

  // TEST 6: Normalization & Schema Compliance
  console.log('[TEST 6] Testing Normalization & Schema Validation...');
  const cleanLead = normalizer.normalizeLead(sample);
  if (!cleanLead.company_name || !cleanLead.source.includes('Facebook')) {
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
    throw new Error('Deduplication check failed to detect recently inserted Facebook lead');
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
  console.log('SUMMARY: 8/8 Facebook Tests Passed successfully!');
  console.log('================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ Facebook Test Suite Error:', err.message);
  process.exit(1);
});
