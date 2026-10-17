// lib/connectors/google_maps.js
// 100% Free Hyper-Local Business Scraper for Google Maps
// Uses Puppeteer with Stealth Plugin (Zero Paid APIs, Zero Keys, Zero Third-Party Subscriptions)

import { BaseConnector } from './base.js';
import fs from 'fs';

// Known Chrome/Edge executable fallback paths on Windows / Linux / macOS
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

export class GoogleMapsConnector extends BaseConnector {
  constructor() {
    super('GMAPS', 'Google Maps', 'Google Maps Hyper-Local Places (Free Headless Engine)', false);
  }

  /**
   * Lazily loads puppeteer with stealth plugin
   */
  async getPuppeteer() {
    try {
      const puppeteerExtraModule = await import('puppeteer-extra');
      const stealthPluginModule = await import('puppeteer-extra-plugin-stealth');
      const puppeteer = puppeteerExtraModule.default || puppeteerExtraModule;
      const StealthPlugin = stealthPluginModule.default || stealthPluginModule;
      puppeteer.use(StealthPlugin());
      return puppeteer;
    } catch {
      // Fallback to standard puppeteer if plugin is not available
      const standardPuppeteer = await import('puppeteer');
      return standardPuppeteer.default || standardPuppeteer;
    }
  }

  /**
   * Search Google Maps for hyper-local businesses
   * @param {string} query - e.g. "plumbers in Brooklyn, NY" or "dentist in Indiranagar, Bangalore"
   * @param {number} limit - maximum number of leads to collect
   * @returns {Promise<Array<object>>} raw lead objects ready for normalization
   */
  async search(query = 'coffee shop in New York', limit = 15) {
    const cleanQuery = (query || '').trim() || 'businesses near me';
    const maxResults = Math.min(Math.max(limit, 1), 60);

    const puppeteer = await this.getPuppeteer();
    const systemBrowser = findSystemBrowser();

    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=en-US,en'
      ]
    };

    if (systemBrowser) {
      launchOptions.executablePath = systemBrowser;
    }

    let browser = null;
    const leads = [];

    try {
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      // Configure viewport and language headers
      await page.setViewport({ width: 1366, height: 768 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
      });

      // Construct Google Maps search URL with English language forced
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(cleanQuery)}?hl=en`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // Dismiss cookie consent dialogs if present (common in EU/UK/international)
      await this.dismissConsentIfPresent(page);

      // Wait for results feed or place details
      try {
        await page.waitForSelector('div[role="feed"], div[aria-label*="Results"], a[href*="/maps/place/"]', { timeout: 8000 });
      } catch {
        // continue
      }
      await this.sleep(1200);

      // Check if the search redirected directly to a single business place page
      const currentUrl = page.url();
      if (currentUrl.includes('/maps/place/')) {
        const singleLead = await this.extractSinglePlaceDetails(page, cleanQuery);
        if (singleLead) leads.push(singleLead);
        return leads;
      }

      // Locate the scrollable results feed container
      const feedSelector = 'div[role="feed"]';
      try {
        await page.waitForSelector(feedSelector, { timeout: 10000 });
      } catch {
        // Feed not immediately found, try scanning for direct place links
      }

      // Scroll the results feed pane incrementally to load items
      let previousCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 15;

      while (scrollAttempts < maxScrollAttempts) {
        const items = await page.$$('div[role="feed"] > div > div > a[href*="/maps/place/"], a[href*="/maps/place/"]');
        if (items.length >= maxResults || (items.length > 0 && items.length === previousCount && scrollAttempts > 3)) {
          break;
        }

        previousCount = items.length;

        // Scroll the feed pane
        await page.evaluate((selector) => {
          const feed = document.querySelector(selector) || document.querySelector('div[aria-label*="Results"]');
          if (feed) {
            feed.scrollBy(0, 1000);
          } else {
            window.scrollBy(0, 1000);
          }
        }, feedSelector);

        await this.sleep(1500 + Math.floor(Math.random() * 800));
        scrollAttempts++;
      }

      // Extract brief metadata from all visible listing cards in feed
      const rawCards = await page.evaluate(() => {
        const results = [];
        const anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));

        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          const name = a.getAttribute('aria-label') || a.innerText?.split('\n')[0] || '';
          if (!name || results.some(r => r.name === name)) continue;

          // Find container card text
          const cardContainer = a.closest('div[jsaction*="mouseover"]') || a.parentElement;
          const cardText = cardContainer ? cardContainer.innerText : '';

          // Look for website button inside card if present
          let website = '';
          const webAnchor = cardContainer?.querySelector('a[data-value="Website"], a[aria-label*="Website"], a[href^="http"]:not([href*="google.com"])');
          if (webAnchor) {
            website = webAnchor.getAttribute('href') || '';
          }

          // Look for phone text or tel link
          let phone = '';
          const telAnchor = cardContainer?.querySelector('a[href^="tel:"]');
          if (telAnchor) {
            phone = telAnchor.getAttribute('href').replace(/^tel:/i, '');
          }

          results.push({
            name: name.trim(),
            href,
            cardText,
            website,
            phone
          });
        }
        return results;
      });

      // Target up to maxResults
      const targets = rawCards.slice(0, maxResults);

      // Inspect detail panels for the top items to extract full phone, address, website & category
      for (let i = 0; i < targets.length; i++) {
        const card = targets[i];
        try {
          // Navigate directly to the place URL or click
          if (card.href && card.href.startsWith('http')) {
            await page.goto(card.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await this.sleep(1200 + Math.floor(Math.random() * 600));

            const details = await this.extractSinglePlaceDetails(page, cleanQuery, card.name);
            if (details && details.company_name) {
              leads.push(details);
            }
          }
        } catch (detailErr) {
          // If individual detail fetch fails, use card-level text parse fallback
          const fallbackLead = this.parseCardFallback(card, cleanQuery);
          if (fallbackLead) leads.push(fallbackLead);
        }

        // Polite delay between place inspections
        await this.sleep(800 + Math.floor(Math.random() * 500));
      }

    } catch (err) {
      console.error(`[GoogleMapsConnector] Scrape error for query "${cleanQuery}":`, err.message);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore
        }
      }
    }

    return leads;
  }

  /**
   * Dismiss cookie consent banners
   */
  async dismissConsentIfPresent(page) {
    try {
      const consentButtons = [
        'button[aria-label*="Accept all"]',
        'button[aria-label*="Agree"]',
        'form[action*="consent"] button',
        'button:has-text("Accept all")',
        'button:has-text("I agree")'
      ];
      for (const sel of consentButtons) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await this.sleep(1000);
          break;
        }
      }
    } catch {
      // consent dialog not present, continue
    }
  }

  /**
   * Extract comprehensive details from an open Google Maps place detail view
   */
  async extractSinglePlaceDetails(page, originalQuery = '', knownName = '') {
    return await page.evaluate((knownName, originalQuery) => {
      // 1. Company Name
      let companyName = knownName || '';
      if (!companyName) {
        const titleEl = document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"], h1');
        companyName = titleEl ? titleEl.innerText.trim() : '';
      }
      if (!companyName) return null;

      // 2. Category / Industry
      let industry = '';
      const catBtn = document.querySelector('button[jsaction*="category"], span.DkEaL, button.DkEaL');
      if (catBtn) {
        industry = catBtn.innerText.trim();
      }

      // 3. Address
      let address = '';
      const addressBtn = document.querySelector('button[data-item-id="address"], button[aria-label^="Address:"]');
      if (addressBtn) {
        address = addressBtn.getAttribute('aria-label') || addressBtn.innerText || '';
        address = address.replace(/^Address:\s*/i, '').trim();
      }

      // 4. Phone Number
      let phone = '';
      const phoneBtn = document.querySelector('button[data-item-id*="phone:tel:"], button[aria-label^="Phone:"]');
      if (phoneBtn) {
        phone = phoneBtn.getAttribute('aria-label') || phoneBtn.innerText || '';
        phone = phone.replace(/^Phone:\s*/i, '').trim();
      }

      // 5. Website
      let website = '';
      const webBtn = document.querySelector('a[data-item-id="authority"], a[aria-label^="Website:"]');
      if (webBtn) {
        website = webBtn.getAttribute('href') || '';
      }

      // 6. Rating & Reviews
      let rating = '';
      const ratingEl = document.querySelector('span.ceNzKf, div.F7nice span[aria-hidden="true"]');
      if (ratingEl) {
        rating = ratingEl.innerText.trim();
      }

      // 7. Parse City and Postal Code from address if possible
      let city = '';
      let postalCode = '';
      if (address) {
        const parts = address.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          // Last part usually contains country or state + postal code
          const last = parts[parts.length - 1];
          const secondLast = parts[parts.length - 2];
          
          // Check for zip/postal regex (US / UK / Canada / EU / India)
          const zipMatch = address.match(/\b\d{5}(-\d{4})?\b|\b[A-Z]{1,2}\d[A-Z0-9]? \d[A-Z]{2}\b|\b\d{6}\b/i);
          if (zipMatch) postalCode = zipMatch[0];

          city = secondLast;
        }
      }

      // 8. Determine country from address or query
      let country = 'United States';
      const lowerAddr = (address + ' ' + originalQuery).toLowerCase();
      if (lowerAddr.includes('uk') || lowerAddr.includes('london') || lowerAddr.includes('england') || lowerAddr.includes('united kingdom')) {
        country = 'United Kingdom';
      } else if (lowerAddr.includes('canada') || lowerAddr.includes('toronto') || lowerAddr.includes('vancouver') || lowerAddr.includes('ontario')) {
        country = 'Canada';
      } else if (lowerAddr.includes('australia') || lowerAddr.includes('sydney') || lowerAddr.includes('melbourne')) {
        country = 'Australia';
      } else if (lowerAddr.includes('india') || lowerAddr.includes('mumbai') || lowerAddr.includes('bangalore') || lowerAddr.includes('delhi')) {
        country = 'India';
      } else if (lowerAddr.includes('france') || lowerAddr.includes('paris')) {
        country = 'France';
      } else if (lowerAddr.includes('germany') || lowerAddr.includes('berlin') || lowerAddr.includes('munich')) {
        country = 'Germany';
      } else if (lowerAddr.includes('singapore')) {
        country = 'Singapore';
      }

      return {
        company_name: companyName,
        registration_number: '',
        country,
        status: 'Active',
        incorporation_date: '',
        company_type: industry || 'Local Business',
        address,
        city,
        postal_code: postalCode,
        director: '',
        website,
        email: '',
        phone,
        industry: industry || 'Local Business',
        source: 'Google Maps (Hyper-Local)',
        enrichment_status: (phone || website) ? 'enriched' : 'pending'
      };
    }, knownName, originalQuery);
  }

  /**
   * Fallback parse if detail navigation fails
   */
  parseCardFallback(card, originalQuery) {
    if (!card || !card.name) return null;

    // Search for phone pattern in cardText
    const phoneMatch = card.cardText.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
    const phone = card.phone || (phoneMatch ? phoneMatch[0] : '');

    return {
      company_name: card.name,
      registration_number: '',
      country: 'United States',
      status: 'Active',
      incorporation_date: '',
      company_type: 'Local Business',
      address: '',
      city: '',
      postal_code: '',
      director: '',
      website: card.website || '',
      email: '',
      phone,
      industry: 'Local Business',
      source: 'Google Maps (Hyper-Local)',
      enrichment_status: (phone || card.website) ? 'enriched' : 'pending'
    };
  }
}

export const googleMapsConnector = new GoogleMapsConnector();
