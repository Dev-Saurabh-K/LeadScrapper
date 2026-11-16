// scripts/test-ui-e2e.mjs
// Comprehensive End-to-End Headless Browser UI Verification Suite

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const COMMON_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

function findSystemBrowser() {
  for (const p of COMMON_CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

async function runUiTests() {
  console.log('\n================================================================');
  console.log('🖥️ RUNNING NEXT.JS E2E HEADLESS BROWSER UI VERIFICATION SUITE');
  console.log('================================================================\n');

  const PORT = 3005;
  const BASE_URL = `http://localhost:${PORT}`;
  let serverProcess = null;
  let browser = null;
  const pageErrors = [];

  try {
    // 1. Start Next.js standalone production server
    console.log(`[SETUP] Spawning Next.js server on port ${PORT}...`);
    serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT)], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg.includes('Ready') || msg.includes('started')) {
        console.log(`  -> Server stdout: ${msg}`);
      }
    });

    serverProcess.stderr.on('data', (d) => {
      const err = d.toString().trim();
      if (err) console.warn(`  -> Server stderr: ${err}`);
    });

    await waitForServer(BASE_URL, 30000);
    console.log(`  ✅ Server is ready and accepting requests at ${BASE_URL}!\n`);

    // 2. Launch Puppeteer
    console.log('[SETUP] Launching headless Chromium browser...');
    const execPath = findSystemBrowser();
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    };
    if (execPath) {
      launchOptions.executablePath = execPath;
      console.log(`  -> Using browser executable: ${execPath}`);
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network connection failures to remote supabase demo host
        if (!text.includes('supabase.co') && !text.includes('Failed to load resource')) {
          pageErrors.push(`Console Error: ${text}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(`Uncaught Page Exception: ${err.message}`);
    });

    // -------------------------------------------------------------
    // TEST 1: Initial Page Render
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Initial Page Navigation...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 20000 });
    const pageTitle = await page.title();
    console.log(`  -> Page title: "${pageTitle}"`);
    console.log('  ✅ Navigation successful!\n');

    // -------------------------------------------------------------
    // TEST 2: Navigation to Scraper Control Panel
    // -------------------------------------------------------------
    console.log('[TEST 2] Navigating to "Find Leads" scraper tab...');
    const tabClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const scraperBtn = buttons.find(b => b.textContent.includes('Find Leads') || b.textContent.includes('Scraper'));
      if (scraperBtn) {
        scraperBtn.click();
        return true;
      }
      return false;
    });

    if (!tabClicked) {
      throw new Error('Failed to find "Find Leads" tab button');
    }
    await page.evaluate(() => new Promise(r => setTimeout(r, 600)));
    console.log('  ✅ Switched to "Find Leads" tab!\n');

    // -------------------------------------------------------------
    // TEST 3: Engine Switcher Presence (All 4 Engines)
    // -------------------------------------------------------------
    console.log('[TEST 3] Verifying 4-Engine Switcher (Maps, LinkedIn, Instagram, Facebook)...');
    const engines = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        hasMaps: buttons.some(b => b.textContent.includes('Google Maps')),
        hasLinkedIn: buttons.some(b => b.textContent.includes('LinkedIn Leads')),
        hasInstagram: buttons.some(b => b.textContent.includes('Instagram Leads')),
        hasFacebook: buttons.some(b => b.textContent.includes('Facebook Leads'))
      };
    });

    console.log(`  -> Maps button found: ${engines.hasMaps}`);
    console.log(`  -> LinkedIn button found: ${engines.hasLinkedIn}`);
    console.log(`  -> Instagram button found: ${engines.hasInstagram}`);
    console.log(`  -> Facebook button found: ${engines.hasFacebook}`);

    if (!engines.hasMaps || !engines.hasLinkedIn || !engines.hasInstagram || !engines.hasFacebook) {
      throw new Error(`Engine switcher missing engines: ${JSON.stringify(engines)}`);
    }
    console.log('  ✅ All 4 Engines present in Switcher!\n');

    // -------------------------------------------------------------
    // TEST 4: Engine Switching & Form Content
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing Switching between Engines...');

    // 4A: Select Facebook
    console.log('  -> Clicking Facebook Leads engine...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Facebook Leads'));
      if (btn) btn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

    const fbHeading = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent.trim() : '';
    });
    console.log(`  -> Facebook Heading: "${fbHeading}"`);
    if (!fbHeading.includes('Facebook')) {
      throw new Error(`Expected heading to include "Facebook", got: "${fbHeading}"`);
    }

    // 4B: Select Instagram
    console.log('  -> Clicking Instagram Leads engine...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Instagram Leads'));
      if (btn) btn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

    const igHeading = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent.trim() : '';
    });
    console.log(`  -> Instagram Heading: "${igHeading}"`);
    if (!igHeading.includes('Instagram')) {
      throw new Error(`Expected heading to include "Instagram", got: "${igHeading}"`);
    }

    // 4C: Select LinkedIn
    console.log('  -> Clicking LinkedIn Leads engine...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('LinkedIn Leads'));
      if (btn) btn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

    const liHeading = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent.trim() : '';
    });
    console.log(`  -> LinkedIn Heading: "${liHeading}"`);
    if (!liHeading.includes('LinkedIn')) {
      throw new Error(`Expected heading to include "LinkedIn", got: "${liHeading}"`);
    }

    // 4D: Select Google Maps
    console.log('  -> Clicking Google Maps engine...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Google Maps'));
      if (btn) btn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

    const mapsHeading = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.textContent.trim() : '';
    });
    console.log(`  -> Google Maps Heading: "${mapsHeading}"`);
    if (!mapsHeading.includes('Google Maps')) {
      throw new Error(`Expected heading to include "Google Maps", got: "${mapsHeading}"`);
    }
    console.log('  ✅ Engine switcher changes form headers dynamically!\n');

    // -------------------------------------------------------------
    // TEST 5: Facebook Form Interactivity & Query Synthesis
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Facebook Form Interactivity & Query Synthesis...');
    // Switch back to Facebook
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Facebook Leads'));
      if (btn) btn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

    // Click Category pill "Real Estate & Realtors"
    const clickedCat = await page.evaluate(() => {
      const catBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Real Estate & Realtors'));
      if (catBtn) {
        catBtn.click();
        return true;
      }
      return false;
    });
    console.log(`  -> Clicked "Real Estate & Realtors" preset: ${clickedCat}`);

    // Click Intent pill "Call Now / Phone"
    const clickedIntent = await page.evaluate(() => {
      const intBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Call Now / Phone'));
      if (intBtn) {
        intBtn.click();
        return true;
      }
      return false;
    });
    console.log(`  -> Clicked "Call Now / Phone" preset: ${clickedIntent}`);

    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    // Check synthesized query preview
    const queryPreview = await page.evaluate(() => {
      const allMono = Array.from(document.querySelectorAll('.font-mono'));
      const previewEl = allMono.find(el => el.textContent.includes('site:facebook.com'));
      return previewEl ? previewEl.textContent.trim() : '';
    });
    console.log(`  -> Synthesized Facebook Query: ${queryPreview}`);
    if (!queryPreview.includes('site:facebook.com') || !queryPreview.includes('Real Estate') || !queryPreview.includes('Call Now')) {
      throw new Error(`Synthesized query missing criteria. Got: "${queryPreview}"`);
    }

    // Check Action button text
    const actionBtnText = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start Facebook Search'));
      return btn ? btn.textContent.trim() : '';
    });
    console.log(`  -> Action button label: "${actionBtnText}"`);
    if (!actionBtnText.includes('Start Facebook Search')) {
      throw new Error(`Expected button text to include "Start Facebook Search", got: "${actionBtnText}"`);
    }
    console.log('  ✅ Facebook Form Presets and Real-Time Query Preview verified!\n');

    // -------------------------------------------------------------
    // TEST 6: Leads Explorer & Preview Filter Pills
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Leads Explorer & Engine Filter Pills...');
    // Switch back to Dashboard tab
    await page.evaluate(() => {
      const expBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dashboard'));
      if (expBtn) expBtn.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 600)));

    const previewFilters = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return {
        all: buttons.some(b => b.textContent.includes('All (')),
        p1: buttons.some(b => b.textContent.includes('Both Phone & Email')),
        linkedin: buttons.some(b => b.textContent.includes('LinkedIn (')),
        instagram: buttons.some(b => b.textContent.includes('Instagram (')),
        facebook: buttons.some(b => b.textContent.includes('Facebook (')),
        maps: buttons.some(b => b.textContent.includes('Google Maps ('))
      };
    });

    console.log(`  -> Filter "All" present: ${previewFilters.all}`);
    console.log(`  -> Filter "Both Phone & Email" present: ${previewFilters.p1}`);
    console.log(`  -> Filter "LinkedIn" present: ${previewFilters.linkedin}`);
    console.log(`  -> Filter "Instagram" present: ${previewFilters.instagram}`);
    console.log(`  -> Filter "Facebook" present: ${previewFilters.facebook}`);
    console.log(`  -> Filter "Google Maps" present: ${previewFilters.maps}`);

    if (!previewFilters.all || !previewFilters.facebook || !previewFilters.instagram || !previewFilters.linkedin) {
      throw new Error(`Leads Explorer missing preview filter pills: ${JSON.stringify(previewFilters)}`);
    }

    // Click Facebook filter pill
    await page.evaluate(() => {
      const fbFilter = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Facebook ('));
      if (fbFilter) fbFilter.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
    console.log('  ✅ Leads Explorer Preview filters verified!\n');

    // -------------------------------------------------------------
    // TEST 7: Zero Unhandled Console Errors
    // -------------------------------------------------------------
    console.log('[TEST 7] Checking for Unhandled Frontend Exceptions...');
    if (pageErrors.length > 0) {
      console.error('  ❌ Unhandled errors detected during UI session:');
      for (const err of pageErrors) {
        console.error(`    - ${err}`);
      }
      throw new Error(`${pageErrors.length} client-side errors detected`);
    } else {
      console.log('  -> Zero frontend errors or unhandled exceptions logged in browser console.');
      console.log('  ✅ Clean UI execution confirmed!\n');
    }

    console.log('================================================================');
    console.log('🎉 ALL 7/7 UI TESTS PASSED SUCCESSFULLY IN REAL BROWSER!');
    console.log('================================================================\n');

  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
    if (serverProcess) {
      console.log('[CLEANUP] Stopping Next.js server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runUiTests().catch((err) => {
  console.error('\n❌ UI Test Suite Failed:', err.message);
  process.exit(1);
});
