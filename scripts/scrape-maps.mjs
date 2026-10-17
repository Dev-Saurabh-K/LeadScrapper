// scripts/scrape-maps.mjs
// Standalone 100% Free Hyper-Local Google Maps Scraper Runner
// Extracts local businesses, direct phones, addresses, and enriches websites for verified emails.

import fs from 'fs';
import path from 'path';

// Load local .env
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

import { googleMapsConnector } from '../lib/connectors/google_maps.js';
import { normalizer } from '../lib/services/normalizer.js';
import { enrichment } from '../lib/services/enrichment.js';
import { exporter } from '../lib/services/exporter.js';
import { db } from '../lib/database.js';

console.log('================================================================');
console.log('📍 100% FREE GOOGLE MAPS HYPER-LOCAL BUSINESS SCRAPER');
console.log('================================================================\n');

// Parse CLI flags
const args = process.argv.slice(2);
const queryArg = args.find(a => a.startsWith('--query='))?.split('=')[1];
const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1] || 'plumber';
const locationArg = args.find(a => a.startsWith('--location='))?.split('=')[1] || 'Brooklyn, NY';
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10', 10);
const enrichArg = !args.includes('--no-enrich');

const searchQuery = queryArg ? queryArg.replace(/^["']|["']$/g, '') : `${categoryArg} in ${locationArg}`.replace(/^["']|["']$/g, '');

console.log(`🔎 Target Query : "${searchQuery}"`);
console.log(`📊 Max Listings : ${limitArg}`);
console.log(`✨ Auto-Enrich  : ${enrichArg ? 'Yes (Crawling company websites for emails)' : 'No'}\n`);

async function run() {
  const start = Date.now();
  try {
    console.log(`[${new Date().toLocaleTimeString()}] 🚀 Launching Headless Chromium with Stealth Mode...`);
    const rawListings = await googleMapsConnector.search(searchQuery, limitArg);

    console.log(`[${new Date().toLocaleTimeString()}] 📥 Harvested ${rawListings.length} raw business listings from Google Maps.\n`);

    let savedCount = 0;
    let duplicateCount = 0;
    let enrichedEmailsCount = 0;

    for (let i = 0; i < rawListings.length; i++) {
      const raw = rawListings[i];
      try {
        // 1. Normalize
        const cleanLead = normalizer.normalizeLead(raw);

        // 2. Duplicate Check
        const dupCheck = await normalizer.checkDuplicate(cleanLead);
        if (dupCheck.isDuplicate) {
          duplicateCount++;
          console.log(`[${i + 1}/${rawListings.length}] ⏭️  Duplicate skipped: "${cleanLead.company_name}"`);
          continue;
        }

        // 3. Website Contact Enrichment (Email discovery)
        if (enrichArg && cleanLead.website && cleanLead.website.startsWith('http')) {
          console.log(`[${i + 1}/${rawListings.length}] ✨ Enriching website: ${cleanLead.website}...`);
          try {
            const enriched = await enrichment.enrichLead(cleanLead);
            if (enriched.email) {
              cleanLead.email = enriched.email;
              cleanLead.enrichment_status = 'enriched';
              enrichedEmailsCount++;
              console.log(`     📧 Found Email: ${cleanLead.email}`);
            }
            if (!cleanLead.phone && enriched.phone) {
              cleanLead.phone = enriched.phone;
            }
          } catch (e) {
            console.log(`     ⚠️  Enrichment error: ${e.message}`);
          }
        }

        // 4. Save to Database
        await db.insertLead(cleanLead);
        savedCount++;

        console.log(`[${i + 1}/${rawListings.length}] ✅ Saved: "${cleanLead.company_name}" | 📞 ${cleanLead.phone || 'N/A'} | 🌐 ${cleanLead.website || 'N/A'}`);
      } catch (err) {
        console.error(`[${i + 1}/${rawListings.length}] ❌ Error processing lead:`, err.message);
      }
    }

    // 5. Update Excel Export
    console.log('\n📊 Updating Master Excel Lead Sheet...');
    const allLeads = await db.getAllLeads({});
    await exporter.generateMasterExcel(allLeads);

    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log('\n================================================================');
    console.log(`🎉 GOOGLE MAPS SCRAPE COMPLETED in ${elapsed}s!`);
    console.log(`   - New Leads Saved     : ${savedCount}`);
    console.log(`   - Duplicates Skipped  : ${duplicateCount}`);
    console.log(`   - Verified Emails Found: ${enrichedEmailsCount}`);
    console.log(`   - Master Excel Sheet  : exports/Master_B2B_Leads.xlsx`);
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Fatal Google Maps scrape error:', err);
    process.exit(1);
  }
}

run();
