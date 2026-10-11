// scripts/diagnose-scrapers.mjs
// Comprehensive audit of all 7 registry scrapers: test live network requests, record counts, and authentication requirements

import { norwayConnector } from '../lib/connectors/norway_brreg.js';
import { franceConnector } from '../lib/connectors/france_insee.js';
import { singaporeConnector } from '../lib/connectors/singapore_acra.js';
import { usaConnector } from '../lib/connectors/usa_socrata.js';
import { ukConnector } from '../lib/connectors/companies_house.js';
import { canadaConnector } from '../lib/connectors/canada_ised.js';
import { australiaConnector } from '../lib/connectors/australia_abn.js';
import { config } from '../lib/config.js';

console.log('Auditing all 7 country scrapers with live requests...\n');

const results = [];

async function test(country, connector, query = '', limit = 5) {
  const start = Date.now();
  try {
    const records = await connector.search(query, limit);
    const duration = Date.now() - start;
    const isMock = records.some(r => r.source && r.source.includes('Sample') || r.source && r.source.includes('Simulated'));
    
    results.push({
      country,
      source: connector.registryName,
      status: records.length > 0 ? (isMock ? 'WORKING_MOCK' : 'WORKING_LIVE') : 'NOT_WORKING',
      recordCount: records.length,
      sampleCompany: records[0]?.company_name || 'None',
      sampleReg: records[0]?.registration_number || 'None',
      durationMs: duration,
      requiresKey: connector.requiresAuth,
      hasKeyConfigured: country === 'UK' ? config.registries.hasUKKey : (country === 'Australia' ? config.registries.hasAustraliaGuid : true),
      error: null
    });
  } catch (err) {
    results.push({
      country,
      source: connector.registryName,
      status: 'FAILED',
      recordCount: 0,
      sampleCompany: 'None',
      sampleReg: 'None',
      durationMs: Date.now() - start,
      requiresKey: connector.requiresAuth,
      hasKeyConfigured: false,
      error: err.message
    });
  }
}

async function run() {
  await test('Norway', norwayConnector, '', 5);
  await test('France', franceConnector, 'tech', 5);
  await test('Singapore', singaporeConnector, 'tech', 5);
  await test('USA', usaConnector, '', 5);
  await test('UK', ukConnector, 'tech', 5);
  await test('Canada', canadaConnector, 'tech', 5);
  await test('Australia', australiaConnector, 'tech', 5);

  console.log(JSON.stringify(results, null, 2));
}

run();
