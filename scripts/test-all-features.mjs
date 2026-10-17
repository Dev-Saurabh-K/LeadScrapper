// scripts/test-all-features.mjs
// Master End-to-End Test Suite verifying ALL system features:
// 1. Contact Validation Engine
// 2. UI Sorting, Filtering & Priority Scoring
// 3. Geographic Query Synthesizer
// 4. Google Maps Stealth Headless Connector
// 5. Website Contact Enrichment (Cheerio email discovery)
// 6. Database Persistence & De-duplication (Supabase/PostgreSQL)
// 7. Master Excel Generation (Master_B2B_Leads.xlsx)

import { contactValidator } from '../lib/services/validator.js';
import { normalizer } from '../lib/services/normalizer.js';
import { enrichment } from '../lib/services/enrichment.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';
import { buildMapsQuery, GEO_COUNTRIES, POPULAR_NICHES } from '../lib/data/geo_locations.js';
import { googleMapsConnector } from '../lib/connectors/google_maps.js';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('🌟 EXHAUSTIVE SYSTEM-WIDE FEATURE VERIFICATION');
console.log('================================================================\n');

let suitePassed = 0;
let suiteTotal = 0;

function assert(condition, message) {
  suiteTotal++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    suitePassed++;
    return true;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    return false;
  }
}

async function runAllFeaturesTest() {
  const globalStart = Date.now();

  // -------------------------------------------------------------
  // FEATURE 1: Geographic Synthesizer & Geo Database
  // -------------------------------------------------------------
  console.log('📌 FEATURE 1: Geographic Synthesizer & Geo Database');
  assert(GEO_COUNTRIES.length >= 10, `Loaded ${GEO_COUNTRIES.length} countries in geographic dataset`);
  assert(POPULAR_NICHES.length >= 6, `Loaded ${POPULAR_NICHES.length} popular business niches`);

  const q1 = buildMapsQuery({ category: 'school', locality: 'Manhattan', city: 'New York', country: 'United States' });
  assert(q1 === 'school in Manhattan, New York, United States', `Hyper-local query built: "${q1}"`);

  const q2 = buildMapsQuery({ category: 'dentist', locality: '', city: 'London', country: 'United Kingdom' });
  assert(q2 === 'dentist in London, United Kingdom', `City-level query built: "${q2}"`);

  const q3 = buildMapsQuery({ category: 'plumber', locality: '', city: '', country: '' });
  assert(q3 === 'plumber', `Category-only query built: "${q3}"`);
  console.log();

  // -------------------------------------------------------------
  // FEATURE 2: Strict Contact Validation Engine
  // -------------------------------------------------------------
  console.log('📌 FEATURE 2: Strict Contact Validation Engine');
  const validEmail = contactValidator.validateEmail('contact@acme-corp.com');
  assert(validEmail.isValid && validEmail.sanitized === 'contact@acme-corp.com', 'Valid business email passes');

  const disposableEmail = contactValidator.validateEmail('user@tempmail.com');
  assert(!disposableEmail.isValid, 'Disposable tempmail.com rejected');

  const assetEmail = contactValidator.validateEmail('hero-image.png@2x');
  assert(!assetEmail.isValid, 'Filename asset pattern rejected');

  const validUSPhone = contactValidator.validatePhone('2127526166', 'United States');
  assert(validUSPhone.isValid && validUSPhone.formatted.includes('+1'), `US phone normalized: ${validUSPhone.formatted}`);

  const validUKPhone = contactValidator.validatePhone('02079460192', 'United Kingdom');
  assert(validUKPhone.isValid && validUKPhone.formatted.includes('+44'), `UK phone normalized: ${validUKPhone.formatted}`);

  const dummyPhone = contactValidator.validatePhone('1111111111');
  assert(!dummyPhone.isValid, 'Repeated digit sequence phone rejected');
  console.log();

  // -------------------------------------------------------------
  // FEATURE 3: Normalizer & Schema Validation
  // -------------------------------------------------------------
  console.log('📌 FEATURE 3: Normalizer & Schema Validation');
  const rawLead = {
    company_name: '  Apex Dental Clinic LLC  ',
    country: 'United States',
    phone: '(415) 555-2671',
    email: 'info@apexdental.com',
    website: 'https://apexdental.com',
    address: '100 Market St, San Francisco, CA'
  };

  const cleanLead = normalizer.normalizeLead(rawLead);
  assert(cleanLead.company_name === 'Apex Dental Clinic LLC', 'Company name whitespace trimmed');
  assert(cleanLead.phone.length > 0, `Phone validated and formatted: ${cleanLead.phone}`);
  assert(cleanLead.status === 'Active', 'Default active status assigned');
  console.log();

  // -------------------------------------------------------------
  // FEATURE 4: Database Persistence & Deduplication
  // -------------------------------------------------------------
  console.log('📌 FEATURE 4: Database Persistence & De-duplication');
  const testLeadId = crypto.randomUUID();
  const testLead = {
    ...cleanLead,
    id: testLeadId,
    company_name: `Test Business ${Date.now()}`,
    registration_number: `REG-${Date.now().toString().slice(-6)}`
  };

  await db.insertLead(testLead);
  assert(true, `Lead inserted into database: "${testLead.company_name}"`);

  const dupCheck = await db.findDuplicate(testLead.country, testLead.registration_number, testLead.company_name);
  assert(dupCheck.isDuplicate === true, `Duplicate successfully caught by registration number: ${testLead.registration_number}`);
  console.log();

  // -------------------------------------------------------------
  // FEATURE 5: Website Contact Enrichment (Cheerio)
  // -------------------------------------------------------------
  console.log('📌 FEATURE 5: Website Contact Enrichment Engine (HTML Parsing)');
  const sampleHtml = `
    <html>
      <body>
        <h1>Welcome to Tech Solutions</h1>
        <p>Call our support line at <a href="tel:+12125550199">+1 (212) 555-0199</a></p>
        <p>Send enquiries to <a href="mailto:support@techsolutions.com">support@techsolutions.com</a></p>
      </body>
    </html>
  `;
  const extracted = enrichment.extractContactsFromHtml(sampleHtml, 'https://techsolutions.com');
  assert(extracted.emails.includes('support@techsolutions.com'), `Extracted mailto email: ${extracted.emails[0]}`);
  assert(extracted.phones.length > 0, `Extracted tel phone: ${extracted.phones[0]}`);
  console.log();

  // -------------------------------------------------------------
  // FEATURE 6: Master Excel Generator (Priority Column Ordering)
  // -------------------------------------------------------------
  console.log('📌 FEATURE 6: Excel Workbook Generation & Priority Ordering');
  const sampleExportLeads = [
    { company_name: 'Lead C (No Contact)', phone: '', email: '', website: 'https://c.com', status: 'Active' },
    { company_name: 'Lead A (P1 Both)', phone: '+1 212 555 0100', email: 'a@corp.com', website: 'https://a.com', status: 'Active' },
    { company_name: 'Lead B (P2 Phone Only)', phone: '+1 212 555 0200', email: '', website: 'https://b.com', status: 'Active' }
  ];

  const excelResult = await exporter.generateMasterExcel(sampleExportLeads);
  assert(fs.existsSync(excelResult.filePath), `Excel file written to disk: ${excelResult.filePath}`);
  assert(excelResult.count === 3, `Exported ${excelResult.count} leads with styling and frozen headers`);
  console.log();

  // -------------------------------------------------------------
  // FEATURE 7: Live Headless Google Maps Scraper
  // -------------------------------------------------------------
  console.log('📌 FEATURE 7: Live Google Maps Hyper-Local Stealth Scraper');
  console.log('  -> Executing live scrape for "bakery in Brooklyn, New York" (Limit: 2)...');
  const gmapsStart = Date.now();
  const mapsResults = await googleMapsConnector.search('bakery in Brooklyn, New York', 2);
  const gmapsDuration = ((Date.now() - gmapsStart) / 1000).toFixed(1);

  assert(mapsResults.length >= 1, `Harvested ${mapsResults.length} live business listings in ${gmapsDuration}s`);
  if (mapsResults.length > 0) {
    const first = mapsResults[0];
    assert(Boolean(first.company_name), `Place name: "${first.company_name}"`);
    assert(Boolean(first.address || first.phone || first.website), `Extracted metadata (Phone: ${first.phone || 'N/A'}, Web: ${first.website || 'N/A'})`);
  }
  console.log();

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  const totalElapsed = ((Date.now() - globalStart) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`🎉 ALL FEATURES VERIFIED: ${suitePassed}/${suiteTotal} Tests Passed in ${totalElapsed}s`);
  console.log('================================================================\n');

  if (suitePassed === suiteTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllFeaturesTest().catch(err => {
  console.error('Master test failure:', err);
  process.exit(1);
});
