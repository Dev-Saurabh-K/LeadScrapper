// lib/connectors/instagram.js
// Instagram Business & Creator Leads Connector
// Search Engine Lead Extraction with Multi-Engine Fallback (Puppeteer + DuckDuckGo + Bing)

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

const EXCLUDED_IG_HANDLES = new Set([
  'p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'developer',
  'about', 'legal', 'directory', 'tags', 'channel', 'tv', 'ar', 'share',
  'terms', 'privacy', 'help', 'login', 'signup', 'download', 'press', 'api'
]);

export class InstagramConnector extends BaseConnector {
  constructor() {
    super('INSTAGRAM', 'Instagram Leads', 'Instagram Business & Creator Search', false);
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
   * Checks whether a URL is a legitimate public individual/business Instagram profile
   * Rejects post URLs, reels, stories, explore, login, and tag directory pages
   * @param {string} url
   * @returns {boolean}
   */
  isProfileUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (!lower.includes('instagram.com/')) return false;

    // Filter out non-profile subpaths
    const excludedSubpaths = [
      '/p/',
      '/reel/',
      '/reels/',
      '/stories/',
      '/explore/',
      '/accounts/',
      '/direct/',
      '/developer/',
      '/about/',
      '/legal/',
      '/directory/',
      '/tags/',
      '/channel/',
      '/tv/',
      '/ar/',
      '/share/',
      '/terms/',
      '/privacy/',
      '/help/',
      '/login',
      '/signup',
      '/download',
      '/popular/'
    ];

    for (const exc of excludedSubpaths) {
      if (lower.includes(exc)) return false;
    }

    // Match profile handle slug
    const match = lower.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (!match) return false;

    const handle = match[1].toLowerCase();
    if (EXCLUDED_IG_HANDLES.has(handle)) return false;

    // Handles must follow Instagram's naming convention: 1 to 30 characters
    return /^[a-zA-Z0-9._]{1,30}$/.test(handle);
  }

  /**
   * Normalizes Instagram profile URL to canonical https://www.instagram.com/<username>
   * Strips query parameters (?hl=en, ?utm_source=...), anchors, and trailing slashes
   * @param {string} url
   * @returns {string}
   */
  normalizeProfileUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      let clean = url.trim().split('?')[0].split('#')[0];
      clean = clean.replace(/^https?:\/\/(?:www\.)?(?:[a-z]{2,3}\.)?instagram\.com\//i, 'https://www.instagram.com/');
      if (!clean.startsWith('http')) clean = 'https://' + clean.replace(/^\/+/, '');
      clean = clean.replace(/\/+$/, '');
      return clean;
    } catch {
      return (url || '').split('?')[0].trim();
    }
  }

  /**
   * De-obfuscates text containing disguised emails or phone numbers
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
   * Build targeted X-Ray search query for Instagram business & creator profiles
   * @param {object|string} opts - Search criteria or raw query
   * @returns {string} Compiled search engine query
   */
  buildXRayQuery(opts) {
    if (!opts) return 'site:instagram.com business';

    if (typeof opts === 'string') {
      const trimmed = opts.trim();
      if (!trimmed) return 'site:instagram.com business';
      if (trimmed.includes('site:instagram.com')) return trimmed;
      return `site:instagram.com ${trimmed}`;
    }

    const category = String(opts.category ?? opts.niche ?? opts.industry ?? '').trim();
    const location = String(opts.location ?? '').trim();
    const bioIntent = String(opts.bioIntent ?? opts.role ?? '').trim();
    const brand = String(opts.brand ?? opts.company ?? '').trim();
    const username = String(opts.username ?? opts.handle ?? '').trim();
    const query = String(opts.query ?? '').trim();

    if (query) {
      if (query.includes('site:instagram.com')) return query;
      return `site:instagram.com ${query}`;
    }

    const parts = ['site:instagram.com'];
    if (category) parts.push(category);
    if (location) parts.push(location);
    if (bioIntent) parts.push(bioIntent);
    if (brand) parts.push(brand);
    if (username) parts.push(`@${username.replace(/^@/, '')}`);

    if (parts.length === 1) {
      return 'site:instagram.com business';
    }

    return parts.join(' ').trim();
  }

  /**
   * Parse profile details from search result title, URL, and snippet
   * Handles Instagram-specific format: "Name (@handle) • Instagram photos and videos"
   */
  parseProfileFromSnippet(title, url, snippet = '', defaultLocation = '') {
    const rawTitle = String(title || '').trim();
    const rawSnippet = String(snippet || '').trim();
    const cleanUrl = this.normalizeProfileUrl(url);

    // Reject generic search engine meta / login titles
    const lowerTitle = rawTitle.toLowerCase();
    if (
      lowerTitle.includes('log in') ||
      lowerTitle.includes('sign in') ||
      lowerTitle.includes('sign up') ||
      lowerTitle.includes('instagram help center') ||
      lowerTitle.includes('top 10') ||
      lowerTitle.includes('top 20') ||
      lowerTitle.includes('directory')
    ) {
      return null;
    }

    // Extract handle: from title "(@handle)" or URL slug
    let handle = '';
    const titleHandleMatch = rawTitle.match(/\(@([a-zA-Z0-9._]+)\)/i);
    if (titleHandleMatch) {
      handle = titleHandleMatch[1].toLowerCase();
    } else {
      const urlHandleMatch = cleanUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
      if (urlHandleMatch) {
        handle = urlHandleMatch[1].toLowerCase();
      }
    }

    if (!handle || EXCLUDED_IG_HANDLES.has(handle)) {
      return null;
    }

    const registrationNumber = `IG:${handle}`;

    // Clean title suffixes:
    // e.g. "M Fitness Gym (@mfitnessmiami) • Instagram photos and videos" -> "M Fitness Gym"
    let cleanTitle = rawTitle
      .replace(/\s*•\s*Instagram.*$/i, '')
      .replace(/\s*\|\s*Instagram.*$/i, '')
      .replace(/\s*-\s*Instagram.*$/i, '')
      .replace(/\s+on\s+Instagram:.*$/i, '')
      .replace(/\(@[a-zA-Z0-9._]+\)/g, '')
      .trim();

    // Split on dash/separator if headline exists: "Brand Name - Bio"
    let name = '';
    let bioHeadline = '';
    const titleParts = cleanTitle.split(/\s+[-–—|]\s+/);
    if (titleParts.length >= 2) {
      name = titleParts[0].trim();
      bioHeadline = titleParts.slice(1).join(' - ').trim();
    } else {
      name = cleanTitle;
    }

    // Fallback: If name couldn't be parsed or is just "Instagram"
    if (!name || name.length < 2 || name.toLowerCase() === 'instagram') {
      name = handle
        .split(/[._]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
    }

    if (!name) name = `@${handle}`;

    // Extract Followers / Following / Posts metrics from snippet
    // e.g. "3,199 Followers, 3,430 Following, 2,416 Posts - ..."
    let followers = '';
    const followersMatch = rawSnippet.match(/([0-9.,]+[KMBkmb]?)\s+Followers/i);
    if (followersMatch) {
      followers = followersMatch[1];
    }

    let companyType = 'Instagram Creator / Business';
    if (followers) {
      companyType = `Creator / Business (${followers} Followers)`;
    } else if (bioHeadline) {
      companyType = bioHeadline;
    }

    // Extract location from snippet
    let location = defaultLocation;
    const pinLocationMatch = rawSnippet.match(/📍\s*([^·•\n"|]+)/);
    if (pinLocationMatch) {
      location = pinLocationMatch[1].trim();
    } else {
      const locMatch = rawSnippet.match(/(?:Location:\s*|in\s+)?([A-Za-z\s]+(?:,\s*[A-Za-z\s]+){1,2})/);
      if (locMatch && !location) {
        location = locMatch[1].trim();
      }
    }

    // De-obfuscate snippet text before extracting contacts
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

    // Extract public phone numbers / WhatsApp
    let phone = '';
    const phoneMatches = searchableSnippet.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,13}\b/g) || [];
    for (const ph of phoneMatches) {
      const val = contactValidator.validatePhone(ph);
      if (val.isValid) {
        phone = val.formatted || val.sanitized;
        break;
      }
    }

    // Extract city, country, postal code
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

    let postalCode = '';
    const zipMatch = (location + ' ' + rawSnippet).match(/\b\d{5}(-\d{4})?\b|\b[A-Z]{1,2}\d[A-Z0-9]? \d[A-Z]{2}\b|\b\d{6}\b/i);
    if (zipMatch) {
      postalCode = zipMatch[0].trim();
    }

    // Extract external website / company domain from bio snippet for website contact enrichment
    let companyDomain = '';
    const domainMatch = (rawSnippet + ' ' + rawTitle).match(
      /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|io|ai|co|store|shop|me|site|tech|dev|app|in|uk|us|ca|au))\b/i
    );
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase().trim();
      if (!domain.includes('instagram.com') && !domain.includes('facebook.com') && !domain.includes('threads.net')) {
        companyDomain = `https://${domain}`;
      }
    }

    return {
      company_name: name,
      director: `@${handle}`,
      company_type: companyType,
      website: cleanUrl,
      registration_number: registrationNumber,
      status: 'Active',
      address: location || 'United States',
      city: city || 'San Francisco',
      country: country || 'United States',
      postal_code: postalCode,
      industry: 'Creator & Social Media',
      email: email,
      phone: phone,
      company_domain: companyDomain,
      source: 'Instagram'
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
          if (urlText.includes('instagram.com/')) {
            cleanUrl = 'https://' + urlText.replace(/^https?:\/\//, '');
          }
        }

        if (this.isProfileUrl(cleanUrl) && title) {
          const parsed = this.parseProfileFromSnippet(title, cleanUrl, snippet);
          if (parsed) leads.push(parsed);
        }
      });
    } catch (err) {
      console.warn('[InstagramConnector] DuckDuckGo HTTP search error:', err.message);
    }
    return leads;
  }

  /**
   * Additional HTTP Fallback via Bing Search
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
      console.warn('[InstagramConnector] Bing HTTP search fallback error:', err.message);
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

      // Disable media to accelerate page navigation
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
      console.warn('[InstagramConnector] Puppeteer search error, falling back to HTTP:', err.message);
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

export const instagramConnector = new InstagramConnector();
