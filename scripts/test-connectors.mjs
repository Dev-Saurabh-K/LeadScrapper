// scripts/test-connectors.mjs
// Automated verification suite for Google Maps Hyper-Local Scraper & Pipeline Services

import { googleMapsConnector } from '../lib/connectors/google_maps.js';
import { getConnector, listConnectors } from '../lib/connectors/index.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';
import fs from 'fs';

console.log('================================================================');
console.log('🚀 RUNNING GOOGLE MAPS HYPER-LOCAL SCRAPER VERIFICATION SUITE');
console.log('================================================================\n');

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  // [TEST 1] Connector Registry
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Connector Registry (Google Maps sole engine)...`);
  try {
    const list = listConnectors();
    const codes = list.map(c => c.code);
    if (!codes.includes('MAPS') || !codes.includes('LINKEDIN')) {
      throw new Error(`Expected MAPS and LINKEDIN connectors, got: ${JSON.stringify(codes)}`);
    }
    const conn = getConnector('MAPS');
    if (!conn || typeof conn.search !== 'function') {
      throw new Error('getConnector("MAPS") failed to return a valid connector instance');
    }
    console.log(`  -> Registry active engines: ${codes.join(', ')}`);
    console.log(`  ✅ Connector Registry passed!\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Connector Registry failed:`, err.message, '\n');
  }

  // [TEST 2] Live Google Maps Hyper-Local Scraper
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Live Google Maps Scraper (2 records)...`);
  try {
    const records = await googleMapsConnector.search('bakery in Brooklyn, New York', 2);
    console.log(`  -> Harvested ${records.length} records from Google Maps`);

    if (records.length === 0) {
      throw new Error('Google Maps returned 0 records');
    }

    // Validate with normalizer
    for (const raw of records) {
      const clean = normalizer.normalizeLead(raw);
      if (!clean.company_name || !clean.country) {
        throw new Error(`Invalid record: missing company_name or country: ${JSON.stringify(clean)}`);
      }
    }

    console.log(`  -> Sample Lead: "${records[0].company_name}" (Phone: ${records[0].phone || 'N/A'}, Address: ${records[0].address || 'N/A'})`);
    console.log(`  ✅ Live Google Maps Scraper passed! (${records.length} records validated)\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Live Google Maps Scraper failed:`, err.message, '\n');
  }

  // [TEST 3] De-duplication Logic
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing De-duplication Logic...`);
  try {
    const uniqueCompany = `Unique Maps Bakery ${Date.now()}`;
    const testLead1 = {
      company_name: uniqueCompany,
      registration_number: `MAPS-${Date.now()}`,
      country: 'United States',
      status: 'Active',
      source: 'Google Maps (Hyper-Local)'
    };

    await db.insertLead(testLead1);
    const dupCheck = await db.findDuplicate(testLead1.country, testLead1.registration_number, testLead1.company_name);

    if (!dupCheck.isDuplicate) {
      throw new Error('De-duplication failed to catch duplicate lead');
    }

    console.log(`  -> Duplicate detected via field: ${dupCheck.matchedField}`);
    console.log(`  ✅ De-duplication passed!\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ De-duplication failed:`, err.message, '\n');
  }

  // [TEST 4] Master_B2B_Leads.xlsx Generation
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Master_B2B_Leads.xlsx Generation...`);
  try {
    const testLeads = [
      {
        company_name: 'Brooklyn Bread Co',
        phone: '+1 (718) 555-0199',
        email: 'info@brooklynbread.com',
        website: 'https://brooklynbread.com',
        address: '123 Atlantic Ave, Brooklyn, NY',
        country: 'United States',
        status: 'Active',
        source: 'Google Maps (Hyper-Local)'
      }
    ];

    const result = await exporter.generateMasterExcel(testLeads);
    if (!fs.existsSync(result.filePath)) {
      throw new Error(`File was not created at ${result.filePath}`);
    }

    const stats = fs.statSync(result.filePath);
    if (stats.size === 0) {
      throw new Error('Created Excel file is empty');
    }

    console.log(`  -> File created at: ${result.filePath} (${stats.size} bytes, ${result.count} leads)`);
    console.log(`  ✅ Excel Export passed!\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Excel Export failed:`, err.message, '\n');
  }

  // [TEST 5] Email & Phone Number Validation Engine
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Email & Phone Number Validation Engine...`);
  try {
    const { contactValidator } = await import('../lib/services/validator.js');

    const validEmails = ['contact@stripe.com', 'first.last@service.co.uk', 'sales+deals@startup.io'];
    for (const em of validEmails) {
      const res = contactValidator.validateEmail(em);
      if (!res.isValid) throw new Error(`Valid email "${em}" was incorrectly marked as invalid: ${res.error}`);
    }

    const invalidEmails = [
      'logo.png@2x',
      'user@example.com',
      'burner@mailinator.com',
      'consecutive..dots@domain.com',
      '@nodomain.com',
      'notanemail'
    ];
    for (const em of invalidEmails) {
      const res = contactValidator.validateEmail(em);
      if (res.isValid) throw new Error(`Invalid email "${em}" was incorrectly marked as valid!`);
    }

    const validPhones = [
      { raw: '2127526166', country: 'United States' },
      { raw: '+44 20 7946 0192', country: 'United Kingdom' },
      { raw: '+91 98200 12345', country: 'India' }
    ];
    for (const ph of validPhones) {
      const res = contactValidator.validatePhone(ph.raw, ph.country);
      if (!res.isValid) throw new Error(`Valid phone "${ph.raw}" was marked as invalid: ${res.error}`);
    }

    const invalidPhones = ['000000000', '12345678', '1111111111', '123', '+15550199'];
    for (const ph of invalidPhones) {
      const res = contactValidator.validatePhone(ph);
      if (res.isValid) throw new Error(`Invalid phone "${ph}" was incorrectly marked as valid!`);
    }

    console.log(`  -> Validated RFC emails, dummy/disposable filters, and ITU-T E.164 phone formats.`);
    console.log(`  ✅ Email & Phone Validation passed!\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Email & Phone Validation failed:`, err.message, '\n');
  }

  console.log('================================================================');
  console.log(`SUMMARY: ${passedTests}/${totalTests} Tests Passed successfully!`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runTests();
