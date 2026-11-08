// scripts/test-phases.mjs
// Comprehensive 5-Phase Full System Verification Suite

import { contactValidator } from '../lib/services/validator.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { excelParser } from '../lib/services/excel-parser.js';
import { enrichment } from '../lib/services/enrichment.js';
import { db } from '../lib/database.js';
import { getConnector, listConnectors, CONNECTORS } from '../lib/connectors/index.js';
import { buildMapsQuery, GEO_COUNTRIES, POPULAR_NICHES } from '../lib/data/geo_locations.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`    ✅ [PASS] ${message}`);
    passed++;
    return true;
  } else {
    console.error(`    ❌ [FAIL] ${message}`);
    return false;
  }
}

async function runPhasedTesting() {
  const globalStart = Date.now();
  console.log('\n================================================================');
  console.log('🌟 EXHAUSTIVE 5-PHASE SYSTEM TESTING PIPELINE');
  console.log('================================================================\n');

  // =============================================================
  // PHASE 1: UNIT & COMPONENT TESTING
  // =============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 PHASE 1: UNIT & COMPONENT TESTING');
  console.log('═══════════════════════════════════════════════════════════════');

  // 1.1 Email validation
  console.log('  [1.1] Email Syntax & Security Filters');
  const validEmail = contactValidator.validateEmail('ceo@enterprise.co.uk');
  assert(validEmail.isValid && validEmail.sanitized === 'ceo@enterprise.co.uk', 'Valid corporate email accepted');
  const tempEmail = contactValidator.validateEmail('spam@mailinator.com');
  assert(!tempEmail.isValid, 'Disposable burner email (mailinator.com) rejected');
  const assetEmail = contactValidator.validateEmail('banner@2x.png');
  assert(!assetEmail.isValid, 'Media asset filename rejected');

  // 1.2 Phone validation
  console.log('  [1.2] Phone Normalization & Fraud Filters');
  const usPhone = contactValidator.validatePhone('(415) 555-2671', 'US');
  assert(usPhone.isValid && usPhone.formatted.includes('+1'), `US phone normalized: ${usPhone.formatted}`);
  const ukPhone = contactValidator.validatePhone('020 7946 0192', 'UK');
  assert(ukPhone.isValid && ukPhone.formatted.includes('+44'), `UK phone normalized: ${ukPhone.formatted}`);
  const fakePhone = contactValidator.validatePhone('1111111111');
  assert(!fakePhone.isValid, 'Repeated consecutive digit sequence rejected');

  // 1.3 Normalizer
  console.log('  [1.3] Schema Normalization');
  const rawLead = {
    company_name: '   Acme Innovations Inc.  ',
    director: '  Jane Doe ',
    website: 'https://acme.com',
    email: 'contact@acme.com',
    phone: '4155552671',
    country: 'United States'
  };
  const cleanLead = normalizer.normalizeLead(rawLead);
  assert(cleanLead.company_name === 'Acme Innovations Inc.', 'Company name whitespace trimmed');
  assert(cleanLead.director === 'Jane Doe', 'Director name whitespace trimmed');
  assert(cleanLead.email === 'contact@acme.com', 'Email validated and normalized');
  assert(cleanLead.phone.includes('+1'), 'Phone formatted with country code');
  console.log();

  // =============================================================
  // PHASE 2: LIVE ENGINE & CONNECTOR TESTING
  // =============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 PHASE 2: LIVE ENGINE & CONNECTOR TESTING');
  console.log('═══════════════════════════════════════════════════════════════');

  // 2.1 Connector Registry
  console.log('  [2.1] Connector Registry Check');
  const activeEngines = listConnectors().map(c => c.code);
  assert(activeEngines.includes('MAPS') && activeEngines.includes('LINKEDIN'), `Registered engines: ${activeEngines.join(', ')}`);
  const mapsConn = getConnector('MAPS');
  assert(Boolean(mapsConn && mapsConn.search), 'Google Maps connector resolved');
  const liConn = getConnector('LINKEDIN');
  assert(Boolean(liConn && liConn.search), 'LinkedIn connector resolved');

  // 2.2 Live Google Maps Scraper
  console.log('  [2.2] Live Google Maps Places Extraction');
  const gmapsStart = Date.now();
  const mapsResults = await mapsConn.search('bakery in Brooklyn, New York', 2);
  const gmapsTime = ((Date.now() - gmapsStart) / 1000).toFixed(1);
  assert(mapsResults.length >= 1, `Harvested ${mapsResults.length} live Google Maps places in ${gmapsTime}s`);
  if (mapsResults.length > 0) {
    assert(Boolean(mapsResults[0].company_name), `Maps place name: "${mapsResults[0].company_name}"`);
    assert(Boolean(mapsResults[0].address || mapsResults[0].phone), `Maps contact info present`);
  }

  // 2.3 Live LinkedIn Authless Scraper
  console.log('  [2.3] Live LinkedIn Authless Extraction (Zero Tokens / No Login)');
  const liStart = Date.now();
  const liResults = await liConn.search({ role: 'Founder CEO', industry: 'SaaS', location: 'San Francisco' }, 2);
  const liTime = ((Date.now() - liStart) / 1000).toFixed(1);
  assert(liResults.length >= 1, `Harvested ${liResults.length} live LinkedIn profiles in ${liTime}s`);
  if (liResults.length > 0) {
    assert(Boolean(liResults[0].director), `LinkedIn Lead Name: "${liResults[0].director}"`);
    assert(liResults[0].website.includes('linkedin.com/in'), `LinkedIn URL: ${liResults[0].website}`);
    assert(liResults[0].source === 'LinkedIn (Authless)', `Source tag verified`);
  }
  console.log();

  // =============================================================
  // PHASE 3: STORAGE, DEDUPLICATION & EXPORT TESTING
  // =============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💾 PHASE 3: STORAGE, DEDUPLICATION & EXPORT TESTING');
  console.log('═══════════════════════════════════════════════════════════════');

  // 3.1 Database Persistence & Deduplication
  console.log('  [3.1] Persistence & Deduplication');
  const testId = Date.now();
  const dbTestLead = normalizer.normalizeLead({
    company_name: `Phase Test Corp ${testId}`,
    director: `Tester ${testId}`,
    registration_number: `REG-PHASE-${testId}`,
    country: 'United States',
    email: `tester${testId}@phasetest.com`,
    phone: '+1 415 555 0199',
    website: `https://phasetest${testId}.com`
  });
  await db.insertLead(dbTestLead);
  const dupResult = await normalizer.checkDuplicate(dbTestLead);
  assert(dupResult.isDuplicate, `Deduplication successfully caught duplicate REG-PHASE-${testId}`);

  // 3.2 Unified Master Excel Workbook Generation
  console.log('  [3.2] Unified Master Excel Workbook Generation');
  const masterExcel = await exporter.generateMasterExcel();
  assert(fs.existsSync(masterExcel.filePath), `Master_B2B_Leads.xlsx exists on disk`);
  assert(masterExcel.count > 0, `Master workbook populated with ${masterExcel.count} total leads`);

  // 3.3 Custom Column Exporter & Dynamic Table Parser
  console.log('  [3.3] Custom Column Exporter & Dynamic Table Parser');
  const testCustomRows = [
    { 'Company Name': 'Alpha Co', 'Phone': '+1 212 555 0101', 'Email': 'alpha@co.com', 'Website': 'https://alpha.com' },
    { 'Company Name': 'Beta Co', 'Phone': '+1 212 555 0102', 'Email': 'beta@co.com', 'Website': 'https://beta.com' }
  ];
  const customBuffer = await exporter.generateCustomExcel({
    fileName: 'Custom_Phase_Export.xlsx',
    selectedColumns: ['Company Name', 'Phone', 'Email'],
    rows: testCustomRows
  });
  assert(Buffer.isBuffer(customBuffer) && customBuffer.length > 0, `Custom export generated in-memory buffer (${customBuffer.length} bytes)`);

  const parsedRecords = await excelParser.parseBuffer(customBuffer);
  assert(parsedRecords.records && parsedRecords.records.length === 2, `Parsed ${parsedRecords.records?.length} records back from generated Excel buffer`);
  assert(parsedRecords.records[0]['Company Name'] === 'Alpha Co', `Parsed first record matches: "Alpha Co"`);
  console.log();

  // =============================================================
  // PHASE 4: PRIORITY SORTING & DATA MODEL VERIFICATION
  // =============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 PHASE 4: PRIORITY SORTING & FUNNEL LOGIC');
  console.log('═══════════════════════════════════════════════════════════════');

  const mixedLeads = [
    { company_name: 'Lead C (No Contact)', phone: '', email: '', website: 'https://c.com' },
    { company_name: 'Lead A (P1 Both)', phone: '+1 212 555 0100', email: 'a@corp.com', website: 'https://a.com' },
    { company_name: 'Lead B (P2 Phone Only)', phone: '+1 212 555 0200', email: '', website: 'https://b.com' }
  ];

  const sorted = exporter.sortLeadsByPriority(mixedLeads);
  assert(sorted[0].company_name === 'Lead A (P1 Both)', 'P1 (Both Phone & Email) ranked 1st');
  assert(sorted[1].company_name === 'Lead B (P2 Phone Only)', 'P2 (Phone or Email) ranked 2nd');
  assert(sorted[2].company_name === 'Lead C (No Contact)', 'P3 (Website Only / Rest) ranked 3rd');
  console.log();

  // =============================================================
  // PHASE 5: PRODUCTION BUILD & CODE QUALITY
  // =============================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚡ PHASE 5: CODE AUDIT & QUALITY METRICS');
  console.log('═══════════════════════════════════════════════════════════════');

  // Verify zero emojis across components and app
  const dirs = ['app', 'components'];
  let emojiCount = 0;
  function scanEmojis(d) {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) scanEmojis(full);
      else if (f.endsWith('.js') || f.endsWith('.jsx')) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach(l => {
          if (/[\u2190-\u21FF\u2600-\u26FF\u2700-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]/.test(l)) {
            emojiCount++;
          }
        });
      }
    }
  }
  dirs.forEach(scanEmojis);
  assert(emojiCount === 0, `Zero text emojis across UI (Found: ${emojiCount})`);

  // =============================================================
  // FINAL SUMMARY
  // =============================================================
  const totalElapsed = ((Date.now() - globalStart) / 1000).toFixed(1);
  console.log('================================================================');
  console.log(`🎉 5-PHASE TESTING COMPLETE: ${passed}/${total} Assertions Passed in ${totalElapsed}s`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhasedTesting().catch(err => {
  console.error('\n❌ Phase Testing Failure:', err);
  process.exit(1);
});
