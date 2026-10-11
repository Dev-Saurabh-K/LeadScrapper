// scripts/run-scraper.mjs
// Standalone headless CLI scraper runner
// Can be executed directly via `npm run scrape` or automated via Windows Task Scheduler / cron

import fs from 'fs';
import path from 'path';

// Read .env if running standalone
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
} catch {
  // ignore
}

import { collector } from '../lib/services/collector.js';

console.log('================================================================');
console.log('🚀 AUTOMATED B2B LEAD SCRAPER — HEADLESS RUNNER');
console.log('================================================================\n');

// Parse CLI flags or use intelligent defaults
const args = process.argv.slice(2);
const queryArg = args.find(a => a.startsWith('--query='))?.split('=')[1] || 'technology';
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '20', 10);
const enrichArg = !args.includes('--no-enrich');

const targetCountries = ['NO', 'FR', 'SG', 'US'];

console.log(`Target Registries: ${targetCountries.join(', ')}`);
console.log(`Search Query     : "${queryArg}"`);
console.log(`Limit per Country: ${limitArg}`);
console.log(`Website Enriched : ${enrichArg ? 'Yes' : 'No'}\n`);

async function run() {
  const start = Date.now();
  try {
    const result = await collector.runJob({
      countries: targetCountries,
      query: queryArg,
      limit: limitArg,
      enrich: enrichArg,
      delayMs: 1000
    }, (log) => {
      const time = log.timestamp ? log.timestamp.split('T')[1].slice(0, 8) : '';
      const prefix = log.level === 'success' ? '✅' : (log.level === 'error' ? '❌' : (log.level === 'warn' ? '⚠ ' : 'ℹ '));
      console.log(`[${time}] ${prefix} ${log.message}`);
    });

    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log('\n================================================================');
    console.log(`🎉 SCRAPE COMPLETED in ${elapsed}s!`);
    console.log(`   - New Leads Collected : ${result.leadsCollected}`);
    console.log(`   - Duplicates Skipped  : ${result.duplicatesSkipped}`);
    console.log(`   - Errors Encountered  : ${result.errorsCount}`);
    console.log(`   - Excel File Updated  : exports/Master_B2B_Leads.xlsx`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Fatal scrape error:', err);
    process.exit(1);
  }
}

run();
