// lib/connectors/linkedin.js
// 100% Free Authless LinkedIn Leads Scraper (Zero Tokens, Zero Login Required)
// Uses Stealth Search Engine X-Ray Dorking with Multi-Engine Fallback (Puppeteer + DuckDuckGo + Bing)

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
   * Checks whether a URL is a legitimate public individual LinkedIn profile
   * Filters out directory pages, login redirections, posts, pulses, and company hubs
   * @param {string} url 
   * @returns {boolean}
   */
  isProfileUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (!lower.includes('linkedin.com/in/')) return false;

    const excludedPaths = [
      '/in/dir/',
      '/in/dir',
      '/in/unavailable',
      '/in/login',
      '/in/checkpoint',
      '/pulse/',
      '/company/',
      '/jobs/',
      '/school/',
      '/posts/',
      '/learning/'
    ];

    for (const exc of excludedPaths) {
      if (lower.includes(exc)) return false;
    }
    return true;
  }

  /**
   * Normalizes LinkedIn profile URL
   * Strips country subdomains (uk.linkedin.com -> www.linkedin.com), tracking query params, and trailing slashes
   * @param {string} url 
   * @returns {string}
   */
  normalizeProfileUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      let clean = url.trim().split('?')[0].split('#')[0];
      // Normalize country language subdomains to www.linkedin.com
      clean = clean.replace(/^https?:\/\/[a-z]{2,3}\.linkedin\.com\//i, 'https://www.linkedin.com/');
      if (!clean.startsWith('http')) clean = 'https://' + clean.replace(/^\/+/, '');
      clean = clean.replace(/\/+$/, '');
      return clean;
    } catch {
      return (url || '').split('?')[0].trim();
    }
  }

  /**
   * De-obfuscates text containing disguised emails (e.g. "john [at] acme [dot] com")
   * @param {string} text 
   * @returns {string}
   */
  deobfuscateText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/\s*\[\s*(?:at|@)\s*\]\s*/gi, '@')
      .replace(/\s*\(\s*(?:at|@)\s*\)\s*/gi, '@')
      .replace(/\s*\{at\}\s*/gi, '@')
      .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
      .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
      .replace(/\s*\{dot\}\s*/gi, '.');
  }

  /**
   * Build targeted X-Ray search query for LinkedIn profiles
   * Handles non-string criteria, nulls, special characters, and empty query defaults
   * @param {object|string} opts - Search criteria or raw query
   * @returns {string} Compiled search engine query
   */
  buildXRayQuery(opts) {
    if (!opts) return 'site:linkedin.com/in Founder CEO';

    if (typeof opts === 'string') {
      const trimmed = opts.trim();
      if (!trimmed) return 'site:linkedin.com/in Founder CEO';
      if (trimmed.includes('site:linkedin.com')) return trimmed;
      return `site:linkedin.com/in ${trimmed}`;
    }

    const role = String(opts.role ?? '').trim();
    const industry = String(opts.industry ?? '').trim();
    const location = String(opts.location ?? '').trim();
    const company = String(opts.company ?? '').trim();
    const query = String(opts.query ?? '').trim();

    if (query) {
      if (query.includes('site:linkedin.com')) return query;
      return `site:linkedin.com/in ${query}`;
    }

    const parts = ['site:linkedin.com/in'];
    if (role) parts.push(role);
    if (industry) parts.push(industry);
    if (location) parts.push(location);
    if (company) parts.push(company);

    if (parts.length === 1) {
      return 'site:linkedin.com/in Founder CEO';
    }

    return parts.join(' ').trim();
  }

  /**
   * Parse profile details from search result title, URL, and snippet
   */
  parseProfileFromSnippet(title, url, snippet = '', defaultLocation = '') {
    const rawTitle = String(title || '').trim();
    const rawSnippet = String(snippet || '').trim();
    const cleanUrl = this.normalizeProfileUrl(url);

    // Reject search engine meta/login titles
    const lowerTitle = rawTitle.toLowerCase();
    if (
      lowerTitle.includes('sign in') ||
      lowerTitle.includes('log in') ||
      lowerTitle.includes('top 10') ||
      lowerTitle.includes('top 20') ||
      lowerTitle.includes('profiles on linkedin') ||
      lowerTitle.includes('directory')
    ) {
      return null;
    }

    // Clean title suffixes
    let cleanTitle = rawTitle.replace(/\s*\|\s*LinkedIn.*$/i, '').trim();

    let name = '';
    let headline = '';
    let company = '';

    // Split by dash or separator: "Name - Headline / Role - Company"
    const segments = cleanTitle.split(/\s+[-–—|]\s+/);
    if (segments.length >= 2) {
      name = segments[0].trim();
      headline = segments.slice(1).join(' - ').trim();
    } else {
      name = cleanTitle;
    }

    // Fallback: If name couldn't be parsed or is too short, recover human name from URL slug
    if (!name || name.length < 2 || name.toLowerCase() === 'linkedin') {
      const slugMatch = cleanUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
      if (slugMatch) {
        const slug = slugMatch[1].replace(/[-_]\d+.*$/, ''); // strip trailing numeric hashes
        name = slug
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
          .trim();
      }
    }

    if (!name) name = 'LinkedIn Professional';

    // Extract company from headline (e.g. "CEO @ Acme Corp", "Founder at Stripe")
    const companyMatch = headline.match(/(?:at|@)\s+([^|·•,\-]+)/i);
    if (companyMatch) {
      company = companyMatch[1].trim();
    }

    // Extract experience from snippet if company still missing
    if (!company) {
      const expMatch = rawSnippet.match(/Experience:\s*([^·•\n]+)/i);
      if (expMatch) {
        company = expMatch[1].trim();
      }
    }

    if (!company) {
      company = 'Independent / Self-Employed';
    }

    // Location extraction from snippet
    let location = defaultLocation;
    const locMatch = rawSnippet.match(/(?:Location:\s*|in\s+)?([A-Za-z\s]+(?:,\s*[A-Za-z\s]+){1,2})/);
    if (locMatch && !location) {
      location = locMatch[1].trim();
    }

    // De-obfuscate snippet text before checking contacts
    const searchableSnippet = this.deobfuscateText(rawSnippet + ' ' + rawTitle);

    // Extract public emails
    let email = '';
    const emailMatches = searchableSnippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    for (const em of emailMatches) {
      const val = contactValidator.validateEmail(em);
      if (val.isValid) {
        email = val.sanitized;
        break;
      }
    }

    // Extract public phone numbers
    let phone = '';
    const phoneMatches = searchableSnippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    for (const ph of phoneMatches) {
      const val = contactValidator.validatePhone(ph);
      if (val.isValid) {
        phone = val.formatted;
        break;
      }
    }

    // Extract normalized handle for database deduplication
    const usernameMatch = cleanUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
    const handle = usernameMatch ? decodeURIComponent(usernameMatch[1]).toLowerCase() : `${Date.now()}`;
    const registrationNumber = `LI:${handle}`;

    // Extract country and city
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

        if (this.isProfileUrl(cleanUrl) && title) {
          const parsed = this.parseProfileFromSnippet(title, cleanUrl, snippet);
          if (parsed) leads.push(parsed);
        }
      });
    } catch (err) {
      console.warn('[LinkedInConnector] DuckDuckGo HTTP search error:', err.message);
    }
    return leads;
  }

  /**
   * Additional HTTP Fallback via Bing Search (Free, zero login, high reliability)
   */
  async searchViaBing(compiledQuery, limit = 15) {
    const leads = [];
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(compiledQuery)}&count=20`;
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

      $('li.b_algo').each((_, el) => {
        if (leads.length >= limit) return false;
        const titleEl = $(el).find('h2 a');
        const title = titleEl.text().trim();
        const rawHref = titleEl.attr('href') || '';
        const snippet = $(el).find('.b_caption p').text().trim();

        if (this.isProfileUrl(rawHref) && title) {
          const parsed = this.parseProfileFromSnippet(title, rawHref, snippet);
          if (parsed) leads.push(parsed);
        }
      });
    } catch (err) {
      console.warn('[LinkedInConnector] Bing HTTP search fallback error:', err.message);
    }
    return leads;
  }

  /**
   * Headless Stealth Puppeteer Search with infinite scroll and multi-engine HTTP fallback
   */
  async search(queryOptions = {}, limit = 15) {
    const compiledQuery = this.buildXRayQuery(queryOptions);
    const targetLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const puppeteer = await this.getPuppeteer();
    const systemBrowser = findSystemBrowser();

    let browser = null;
    const leads = [];
    const seenHandles = new Set();

    const addLead = (lead) => {
      if (!lead || !lead.registration_number) return;
      if (!seenHandles.has(lead.registration_number)) {
        seenHandles.add(lead.registration_number);
        leads.push(lead);
      }
    };

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

      // Disable images and media to accelerate page navigation
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

          if (this.isProfileUrl(href) && title) {
            const lead = this.parseProfileFromSnippet(title, href, snippet);
            if (lead) addLead(lead);
          }
        });

        if (leads.length >= targetLimit) break;

        // Try clicking "More Results" button or scrolling down
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

    // Secondary Fallback: DuckDuckGo HTTP
    if (leads.length < targetLimit) {
      const httpLeads = await this.searchViaHttp(compiledQuery, targetLimit - leads.length);
      for (const hl of httpLeads) {
        addLead(hl);
      }
    }

    // Tertiary Fallback: Bing Search HTTP
    if (leads.length < targetLimit) {
      const bingLeads = await this.searchViaBing(compiledQuery, targetLimit - leads.length);
      for (const bl of bingLeads) {
        addLead(bl);
      }
    }

    return leads.slice(0, targetLimit);
  }
}

export const linkedInConnector = new LinkedInConnector();
