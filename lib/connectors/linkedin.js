// lib/connectors/linkedin.js
// 100% Free Authless LinkedIn Leads Scraper (Zero Tokens, Zero Login Required)
// Uses Stealth Search Engine X-Ray Dorking to extract B2B Decision Makers and Professionals

import { BaseConnector } from './base.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { contactValidator } from '../services/validator.js';

// Fallback paths for Chrome/Edge binaries across Windows / Linux / macOS
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
    if (fs.existsSync(/* turbopackIgnore: true */ p)) return p;
  }
  return null;
}

export class LinkedInConnector extends BaseConnector {
  constructor() {
    super('LINKEDIN', 'LinkedIn Leads', 'LinkedIn Authless People Search (No Token / No Login)', false);
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
      const standardPuppeteer = await import('puppeteer');
      return standardPuppeteer.default || standardPuppeteer;
    }
  }

  /**
   * Build targeted X-Ray search query for LinkedIn profiles
   * @param {object|string} opts - Search criteria or raw query
   * @returns {string} Compiled search engine query
   */
  buildXRayQuery(opts) {
    if (typeof opts === 'string') {
      const trimmed = opts.trim();
      if (trimmed.includes('site:linkedin.com')) return trimmed;
      return `site:linkedin.com/in ${trimmed}`;
    }

    const { role = '', industry = '', location = '', company = '', query = '' } = opts || {};
    if (query && query.trim()) {
      const trimmed = query.trim();
      if (trimmed.includes('site:linkedin.com')) return trimmed;
      return `site:linkedin.com/in ${trimmed}`;
    }

    const parts = ['site:linkedin.com/in'];
    if (role && role.trim()) parts.push(role.trim());
    if (industry && industry.trim()) parts.push(industry.trim());
    if (location && location.trim()) parts.push(location.trim());
    if (company && company.trim()) parts.push(company.trim());

    return parts.join(' ').trim();
  }

  /**
   * Parse profile details from search result title and snippet
   */
  parseProfileFromSnippet(title, url, snippet, defaultLocation = '') {
    // Standard LinkedIn title formats:
    // "Elvin Aliev - B2B SaaS Founder | LinkedIn"
    // "Herman Sanghera - Founder & CEO @ Atlas | LinkedIn"
    // "John Doe - VP of Sales - Acme Corp | LinkedIn"
    let cleanTitle = (title || '').replace(/\s*\|\s*LinkedIn.*$/i, '').trim();

    let name = '';
    let headline = '';
    let company = '';

    // Split by dash or separator
    const segments = cleanTitle.split(/\s+[-–—]\s+/);
    if (segments.length >= 2) {
      name = segments[0].trim();
      headline = segments.slice(1).join(' - ').trim();
    } else {
      name = cleanTitle;
    }

    // Try extracting company from headline (e.g. "CEO @ Atlas", "Founder at Stripe")
    const companyMatch = headline.match(/(?:at|@)\s+([^|·•,\-]+)/i);
    if (companyMatch) {
      company = companyMatch[1].trim();
    }

    // Try extracting experience and location from snippet
    // Snippet often has: "Experience: LeadWinner.ai · Education: ... · San Francisco, CA"
    if (!company) {
      const expMatch = snippet.match(/Experience:\s*([^·•\n]+)/i);
      if (expMatch) {
        company = expMatch[1].trim();
      }
    }

    // Location extraction from snippet
    let location = defaultLocation;
    const locMatch = snippet.match(/(?:Location:\s*|in\s+)?([A-Za-z\s]+(?:,\s*[A-Za-z\s]+){1,2})/);
    if (locMatch && !location) {
      location = locMatch[1].trim();
    }

    // Clean up fallback company
    if (!company) {
      company = 'Independent / Self-Employed';
    }

    // Clean URL (strip tracking params)
    const cleanUrl = (url || '').split('?')[0].trim();

    // Check for public emails in snippet or title
    let email = '';
    const emailMatches = (snippet + ' ' + title).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    for (const em of emailMatches) {
      const val = contactValidator.validateEmail(em);
      if (val.isValid) {
        email = val.sanitized;
        break;
      }
    }

    // Check for public phones in snippet
    let phone = '';
    const phoneMatches = snippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    for (const ph of phoneMatches) {
      const val = contactValidator.validatePhone(ph);
      if (val.isValid) {
        phone = val.formatted;
        break;
      }
    }

    // Extract handle / username for registration number
    const usernameMatch = cleanUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
    const registrationNumber = usernameMatch ? `LI:${usernameMatch[1]}` : `LI:${Date.now()}`;

    // Extract country and city from location
    let city = '';
    let country = 'United States';
    if (location) {
      const locParts = location.split(',').map(p => p.trim());
      if (locParts.length >= 2) {
        city = locParts[0];
        country = locParts[locParts.length - 1];
      } else {
        city = location;
      }
    }

    return {
      company_name: company,
      director: name,
      company_type: headline || 'Professional',
      website: cleanUrl,
      registration_number: registrationNumber,
      status: 'Active',
      address: location || 'United States',
      city: city || 'San Francisco',
      country: country || 'United States',
      postal_code: '',
      industry: 'Professional Services',
      email: email,
      phone: phone,
      source: 'LinkedIn (Authless)'
    };
  }

  /**
   * Fast HTTP Fallback via DuckDuckGo HTML
   */
  async searchViaHttp(compiledQuery, limit = 15) {
    const leads = [];
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(compiledQuery)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!res.ok) return leads;
      const html = await res.text();
      const $ = cheerio.load(html);

      $('.result').each((_, el) => {
        if (leads.length >= limit) return false;
        const titleEl = $(el).find('.result__title .result__a');
        const title = titleEl.text().trim();
        const rawHref = titleEl.attr('href') || '';
        const snippet = $(el).find('.result__snippet').text().trim();

        let cleanUrl = '';
        const uddgMatch = rawHref.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          cleanUrl = decodeURIComponent(uddgMatch[1]);
        } else {
          const urlText = $(el).find('.result__url').text().trim();
          if (urlText.includes('linkedin.com/in')) {
            cleanUrl = 'https://' + urlText.replace(/^https?:\/\//, '');
          }
        }

        if (cleanUrl.includes('linkedin.com/in') && title) {
          leads.push(this.parseProfileFromSnippet(title, cleanUrl, snippet));
        }
      });
    } catch (err) {
      console.warn('[LinkedInConnector] HTTP search error:', err.message);
    }
    return leads;
  }

  /**
   * Headless Stealth Puppeteer Search with infinite scroll
   */
  async search(queryOptions = {}, limit = 15) {
    const compiledQuery = this.buildXRayQuery(queryOptions);
    const targetLimit = Math.min(Math.max(limit || 10, 1), 50);

    const puppeteer = await this.getPuppeteer();
    const systemBrowser = findSystemBrowser();

    let browser = null;
    const leads = [];
    const seenUrls = new Set();

    try {
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

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );

      // Disable images and fonts to accelerate page loads
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(compiledQuery)}&t=h_&ia=web`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

      // Wait for search results container
      await page.waitForSelector('article[data-testid="result"]', { timeout: 10000 }).catch(() => null);

      let scrolls = 0;
      const maxScrolls = 4;

      while (leads.length < targetLimit && scrolls < maxScrolls) {
        const html = await page.content();
        const $ = cheerio.load(html);

        $('article[data-testid="result"]').each((_, el) => {
          if (leads.length >= targetLimit) return false;
          const a = $(el).find('a[data-testid="result-title-a"]');
          const title = a.text().trim();
          const href = (a.attr('href') || '').split('?')[0].trim();
          const snippet = $(el).find('[data-result="snippet"]').text().trim();

          if (href.includes('linkedin.com/in') && title && !seenUrls.has(href)) {
            seenUrls.add(href);
            const lead = this.parseProfileFromSnippet(title, href, snippet);
            leads.push(lead);
          }
        });

        if (leads.length >= targetLimit) break;

        // Try clicking "More Results" button if available
        scrolls++;
        const moreBtn = await page.$('button#more-results, a.result--more__btn');
        if (moreBtn) {
          await moreBtn.click().catch(() => null);
          await this.sleep(1200);
        } else {
          await page.evaluate(() => window.scrollBy(0, 1000));
          await this.sleep(1000);
        }
      }
    } catch (err) {
      console.warn('[LinkedInConnector] Puppeteer search error, falling back to HTTP:', err.message);
    } finally {
      if (browser) {
        await browser.close().catch(() => null);
      }
    }

    // If Puppeteer didn't collect enough leads, supplement via HTTP fallback
    if (leads.length === 0) {
      const httpLeads = await this.searchViaHttp(compiledQuery, targetLimit);
      for (const hl of httpLeads) {
        if (!seenUrls.has(hl.website)) {
          seenUrls.add(hl.website);
          leads.push(hl);
        }
      }
    }

    return leads.slice(0, targetLimit);
  }
}

export const linkedInConnector = new LinkedInConnector();
