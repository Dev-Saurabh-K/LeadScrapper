// scripts/test-connectors.mjs
// Comprehensive automated test suite for B2B Lead Scraper connectors & services

import { norwayConnector } from '../lib/connectors/norway_brreg.js';
import { franceConnector } from '../lib/connectors/france_insee.js';
import { singaporeConnector } from '../lib/connectors/singapore_acra.js';
import { usaConnector } from '../lib/connectors/usa_socrata.js';
import { ukConnector } from '../lib/connectors/companies_house.js';
import { normalizer } from '../lib/services/normalizer.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';
import fs from 'fs';

console.log('================================================================');
console.log('🚀 RUNNING B2B LEAD SCRAPER VERIFICATION SUITE');
console.log('================================================================\n');

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  async function testConnector(name, connector, query = '', limit = 20) {
    totalTests++;
    console.log(`[TEST ${totalTests}] Testing ${name} Connector (${limit} records)...`);
    try {
      const records = await connector.search(query, limit);
      console.log(`  -> Fetched ${records.length} records from ${name}`);

      if (records.length === 0) {
        throw new Error(`Returned 0 records from ${name}`);
      }

      // Validate every record with normalizer & Zod schema
      for (const raw of records) {
        const clean = normalizer.normalizeLead(raw);
        if (!clean.company_name || !clean.country) {
          throw new Error(`Invalid record: missing company_name or country: ${JSON.stringify(clean)}`);
        }
      }

      console.log(`  -> Sample Lead: "${records[0].company_name}" (Reg: ${records[0].registration_number || 'N/A'}, Country: ${records[0].country})`);
      console.log(`  ✅ ${name} passed! (${records.length}/${limit} records validated)\n`);
      passedTests++;
      return records;
    } catch (err) {
      console.error(`  ❌ ${name} failed:`, err.message, '\n');
      return [];
    }
  }

  // 1. Test Norway BRREG (20 real live records)
  const norwayLeads = await testConnector('Norway BRREG', norwayConnector, '', 20);

  // 2. Test France API (20 real live records)
  const franceLeads = await testConnector('France api.gouv.fr', franceConnector, 'tech', 20);

  // 3. Test Singapore ACRA (20 real live records)
  const sgLeads = await testConnector('Singapore ACRA', singaporeConnector, 'tech', 20);

  // 4. Test USA Socrata (20 real live records)
  const usaLeads = await testConnector('USA Socrata', usaConnector, '', 20);

  // 5. Test UK Companies House (20 records)
  const ukLeads = await testConnector('UK Companies House', ukConnector, 'tech', 20);

  // 6. Test De-duplication Logic
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing De-duplication Logic...`);
  try {
    const testLead = {
      company_name: 'TEST ACME GLOBAL LTD',
      registration_number: 'TEST-999888',
      country: 'Norway',
      status: 'Active',
      source: 'Test Suite'
    };

    // First insert
    await db.insertLead(testLead);

    // Second check
    const dupCheck = await normalizer.checkDuplicate(testLead);
    if (!dupCheck.isDuplicate) {
      throw new Error('De-duplication failed: duplicate was not detected!');
    }

    console.log(`  -> Duplicate detected via field: ${dupCheck.matchField}`);
    console.log(`  ✅ De-duplication passed!\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ De-duplication failed:`, err.message, '\n');
  }

  // 7. Test Excel Generation
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Master_B2B_Leads.xlsx Generation...`);
  try {
    const sampleBatch = [...norwayLeads.slice(0, 5), ...franceLeads.slice(0, 5), ...sgLeads.slice(0, 5)];
    const excelResult = await exporter.generateMasterExcel(sampleBatch);

    if (!fs.existsSync(excelResult.filePath)) {
      throw new Error(`Excel file was not created at ${excelResult.filePath}`);
    }

    const stats = fs.statSync(excelResult.filePath);
    console.log(`  -> File created at: ${excelResult.filePath} (${stats.size} bytes, ${excelResult.count} leads)`);
    console.log(`  ✅ Excel Export passed!\n`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Excel Export failed:`, err.message, '\n');
  }

  // 8. Test Email & Phone Number Validation Engine
  totalTests++;
  console.log(`[TEST ${totalTests}] Testing Email & Phone Number Validation Engine...`);
  try {
    const { contactValidator } = await import('../lib/services/validator.js');

    // Email test assertions
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

    // Phone test assertions
    const validPhones = [
      { raw: '2127526166', country: 'USA' },
      { raw: '+44 20 7946 0192', country: 'UK' },
      { raw: '+47 451 72 987', country: 'Norway' }
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
