// scripts/test-agent-reach-parity.mjs
// Verifies Data Parity between LinkedIn and Google Maps following Agent-Reach core principles

import { linkedInConnector } from '../lib/connectors/linkedin.js';
import { googleMapsConnector } from '../lib/connectors/google_maps.js';
import { normalizer } from '../lib/services/normalizer.js';
import { enrichment } from '../lib/services/enrichment.js';
import { exporter } from '../lib/services/exporter.js';
import { excelParser } from '../lib/services/excel-parser.js';

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

async function runParityTests() {
  const start = Date.now();
  console.log('\n================================================================');
  console.log('🤝 VERIFYING DATA PARITY: LINKEDIN <--> GOOGLE MAPS (AGENT-REACH)');
  console.log('================================================================\n');

  // =============================================================
  // SECTION 1: FIELD SCHEMA PARITY
  // =============================================================
  console.log('--- 1. Schema Parity Check ---');

  // Sample Google Maps lead
  const mapsRaw = {
    company_name: "Artisan Bakery NYC",
    phone: "+1 212 555 0188",
    email: "contact@artisanbakery.com",
    website: "https://artisanbakery.com",
    director: "Marco Rossi",
    address: "450 7th Ave, New York, NY 10123, United States",
    city: "New York",
    postal_code: "10123",
    industry: "Bakery & Food Service",
    country: "United States",
    company_type: "Local Business",
    source: "Google Maps"
  };

  // Sample LinkedIn lead parsed via snippet
  const liSnippet = "Founder & CEO at NextGenAI (nextgenai.tech) · Experience in Cloud & Machine Learning · San Francisco, CA 94105 · Contact: info@nextgenai.tech";
  const liParsed = linkedInConnector.parseProfileFromSnippet(
    "David Chen - Founder & CEO at NextGenAI | LinkedIn",
    "https://www.linkedin.com/in/david-chen-ai",
    liSnippet
  );

  const cleanMaps = normalizer.normalizeLead(mapsRaw);
  const cleanLinkedIn = normalizer.normalizeLead(liParsed);

  const requiredFields = [
    'company_name',
    'director',
    'company_type',
    'website',
    'registration_number',
    'status',
    'address',
    'city',
    'postal_code',
    'industry',
    'country',
    'email',
    'phone',
    'source'
  ];

  requiredFields.forEach(field => {
    const mapsHasField = cleanMaps[field] !== undefined;
    const liHasField = cleanLinkedIn[field] !== undefined;
    assert(mapsHasField && liHasField, `Field "${field}" present in both Maps and LinkedIn schemas`);
  });

  console.log();

  // =============================================================
  // SECTION 2: LINKEDIN EXTRACTED ATTRIBUTES PARITY
  // =============================================================
  console.log('--- 2. LinkedIn Extraction Attributes ---');
  assert(cleanLinkedIn.company_name === 'NextGenAI', `Company extracted: "${cleanLinkedIn.company_name}"`);
  assert(cleanLinkedIn.director === 'David Chen', `Director extracted: "${cleanLinkedIn.director}"`);
  assert(cleanLinkedIn.postal_code === '94105', `ZIP / Postal code extracted: "${cleanLinkedIn.postal_code}"`);
  assert(liParsed.company_domain === 'https://nextgenai.tech', `Company domain identified for enrichment: "${liParsed.company_domain}"`);
  assert(cleanLinkedIn.email === 'info@nextgenai.tech', `Snippet contact email extracted: "${cleanLinkedIn.email}"`);
  assert(cleanLinkedIn.website.includes('linkedin.com/in/david-chen-ai'), `LinkedIn URL preserved: "${cleanLinkedIn.website}"`);
  console.log();

  // =============================================================
  // SECTION 3: WEBSITE ENRICHMENT WORKFLOW FOR LINKEDIN LEADS
  // =============================================================
  console.log('--- 3. Enrichment Workflow on Company Domains ---');

  // Verify that when a LinkedIn lead has a company domain, enrichment can extract contacts
  const testHtml = `
    <html>
      <body>
        <h1>NextGenAI Labs</h1>
        <p>Call our support line: <a href="tel:+14155552671">(415) 555-2671</a></p>
        <p>Email our executive team at <a href="mailto:exec@nextgenai.tech">exec@nextgenai.tech</a></p>
      </body>
    </html>
  `;
  const extracted = enrichment.extractContactsFromHtml(testHtml, 'https://nextgenai.tech');
  assert(extracted.emails.includes('exec@nextgenai.tech'), `Enrichment extracted email: ${extracted.emails[0]}`);
  assert(extracted.phones.some(p => p.includes('+1')), `Enrichment extracted phone: ${extracted.phones[0]}`);

  console.log();

  // =============================================================
  // SECTION 4: UNIFIED MASTER WORKBOOK GENERATION
  // =============================================================
  console.log('--- 4. Unified Master Excel Generation ---');

  const mixedCohort = [cleanMaps, cleanLinkedIn];
  const masterResult = await exporter.generateMasterExcel(mixedCohort);

  assert(masterResult.count === 2, `Exported ${masterResult.count} mixed cohort leads to Master_B2B_Leads.xlsx`);

  const parsedExcel = await excelParser.parseBuffer(masterResult.buffer);
  assert(parsedExcel.totalRecords === 2, `Parsed 2 records back from Master Excel buffer`);

  // Verify columns: Company Name, Phone, Email are Priority
  const firstCol = parsedExcel.columns[0];
  const secondCol = parsedExcel.columns[1];
  const thirdCol = parsedExcel.columns[2];
  assert(firstCol.toLowerCase().includes('company'), `Column 1 is Company: "${firstCol}"`);
  assert(secondCol.toLowerCase().includes('phone'), `Column 2 is Phone (P1): "${secondCol}"`);
  assert(thirdCol.toLowerCase().includes('email'), `Column 3 is Email (P1): "${thirdCol}"`);

  console.log();

  // =============================================================
  // FINAL SUMMARY
  // =============================================================
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log('================================================================');
  console.log(`🎉 AGENT-REACH PARITY VERIFIED: ${passed}/${total} Assertions Passed in ${elapsed}s`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runParityTests().catch(err => {
  console.error('\n❌ Parity Test Error:', err);
  process.exit(1);
});
