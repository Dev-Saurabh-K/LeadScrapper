// scripts/test-linkedin-connector.mjs
// Automated verification suite for Authless LinkedIn Leads Scraper

import { getConnector, CONNECTORS } from '../lib/connectors/index.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';
import fs from 'fs';

async function runSuite() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING LINKEDIN AUTHLESS CONNECTOR VERIFICATION SUITE');
  console.log('================================================================\n');

  // TEST 1: Registry verification
  console.log('[TEST 1] Testing Connector Registry...');
  const liConnector = getConnector('LINKEDIN');
  if (!liConnector || liConnector.code !== 'LINKEDIN') {
    throw new Error('getConnector("LINKEDIN") failed to return LinkedInConnector instance');
  }
  if (!CONNECTORS.LINKEDIN) {
    throw new Error('CONNECTORS.LINKEDIN is not registered in index.js');
  }
  console.log('  -> Registry correctly mapped: "LINKEDIN" ->', liConnector.registryName);
  console.log('  ✅ Connector Registry passed!\n');

  // TEST 2: Query Synthesis
  console.log('[TEST 2] Testing X-Ray Query Builder...');
  const query1 = liConnector.buildXRayQuery({ role: 'Founder CEO', industry: 'SaaS', location: 'San Francisco' });
  const query2 = liConnector.buildXRayQuery('VP Sales FinTech London');
  if (!query1.includes('site:linkedin.com/in') || !query1.includes('Founder CEO')) {
    throw new Error(`Invalid query built: ${query1}`);
  }
  if (!query2.includes('site:linkedin.com/in') || !query2.includes('VP Sales')) {
    throw new Error(`Invalid raw query built: ${query2}`);
  }
  console.log('  -> Query 1:', query1);
  console.log('  -> Query 2:', query2);
  console.log('  ✅ Query Builder passed!\n');

  // TEST 3: Live Authless Profile Extraction
  console.log('[TEST 3] Testing Live LinkedIn Authless Scraper (Harvest 2 profiles)...');
  const rawProfiles = await liConnector.search({ role: 'Founder CEO', industry: 'SaaS', location: 'San Francisco' }, 2);
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    throw new Error('No LinkedIn profiles harvested');
  }
  console.log(`  -> Harvested ${rawProfiles.length} live LinkedIn profiles`);
  const sample = rawProfiles[0];
  console.log(`  -> Sample Lead: "${sample.director}" (${sample.company_type}) at "${sample.company_name}"`);
  console.log(`  -> Profile URL: ${sample.website}`);
  if (!sample.director || !sample.website.includes('linkedin.com/in')) {
    throw new Error('Sample lead missing required Name or LinkedIn URL');
  }
  console.log('  ✅ Live Authless Scraper passed!\n');

  // TEST 4: Normalization & Schema Compliance
  console.log('[TEST 4] Testing Normalization & Schema Validation...');
  const cleanLead = normalizer.normalizeLead(sample);
  if (!cleanLead.company_name || !cleanLead.director || cleanLead.source !== 'LinkedIn (Authless)') {
    throw new Error('Normalized lead missing required fields or incorrect source');
  }
  console.log('  -> Normalized lead source:', cleanLead.source);
  console.log('  -> Lead ID / Reg:', cleanLead.registration_number);
  console.log('  ✅ Normalizer passed!\n');

  // TEST 5: Database Persistence & Deduplication
  console.log('[TEST 5] Testing Database Persistence & Deduplication...');
  await db.insertLead(cleanLead);
  const dupCheck = await normalizer.checkDuplicate(cleanLead);
  if (!dupCheck.isDuplicate) {
    throw new Error('Deduplication check failed to detect recently inserted LinkedIn lead');
  }
  console.log('  -> Successfully detected duplicate for handle:', cleanLead.registration_number);
  console.log('  ✅ Deduplication passed!\n');

  // TEST 6: Excel Workbook Generation
  console.log('[TEST 6] Testing Master_B2B_Leads.xlsx Generation...');
  const excelResult = await exporter.generateMasterExcel();
  if (!fs.existsSync(excelResult.filePath)) {
    throw new Error(`Master Excel file not found at: ${excelResult.filePath}`);
  }
  console.log(`  -> File created at: ${excelResult.filePath} (${excelResult.buffer.length} bytes, ${excelResult.count} leads)`);
  console.log('  ✅ Excel Export passed!\n');

  console.log('================================================================');
  console.log('SUMMARY: 6/6 LinkedIn Tests Passed successfully!');
  console.log('================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ LinkedIn Test Suite Error:', err.message);
  process.exit(1);
});
