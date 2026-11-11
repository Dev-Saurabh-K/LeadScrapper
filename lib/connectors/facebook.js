// lib/connectors/facebook.js
// Facebook Business Pages & Public Profiles Connector
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

const EXCLUDED_FB_HANDLES = new Set([
  'home', 'settings', 'notifications', 'messages', 'about', 'ads', 'business',
  'developer', 'developers', 'help', 'legal', 'privacy', 'policies', 'terms',
  'login', 'signup', 'recover', 'marketplace', 'gaming', 'watch', 'events',
  'groups', 'group', 'pages', 'share', 'sharer', 'dialog', 'plugins', 'photo',
  'photos', 'video', 'videos', 'reel', 'reels', 'post', 'posts', 'checkpoint',
  'story', 'stories', 'hashtag', 'tr', 'browse', 'directory'
]);

export class FacebookConnector extends BaseConnector {
  constructor() {
    super('FACEBOOK', 'Facebook Leads', 'Facebook Business Pages & Public Profiles Search', false);
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
   * Checks whether a URL is a legitimate public business page, place, or public profile
   * Rejects discussion groups, individual posts, photos, video reels, and meta pages
   * @param {string} url
   * @returns {boolean}
   */
  isProfileUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (!lower.includes('facebook.com/')) return false;

    // Filter out non-lead subpaths
    const excludedSubpaths = [
      '/groups/',
      '/group/',
      '/posts/',
      '/post/',
      '/photo/',
      '/photos/',
      '/video/',
      '/videos/',
      '/watch/',
      '/reel/',
      '/reels/',
      '/events/',
      '/event/',
      '/sharer/',
      '/share/',
      '/login',
      '/recover/',
      '/help/',
      '/policies/',
      '/privacy/',
      '/terms/',
      '/marketplace/',
      '/gaming/',
      '/checkpoint/',
      '/story/',
      '/stories/',
      '/dialog/',
      '/plugins/',
      '/tr/',
      '/ads/',
      '/hashtag/'
    ];

    for (const exc of excludedSubpaths) {
      if (lower.includes(exc)) return false;
    }

    // Match handle or page slug
    let handle = '';
    const pageMatch = lower.match(/facebook\.com\/pages\/[^/]+\/([a-zA-Z0-9._-]+)/);
    const pMatch = lower.match(/facebook\.com\/p\/([a-zA-Z0-9._-]+)/);
    const idMatch = lower.match(/facebook\.com\/profile\.php\?id=(\d+)/);
    const directMatch = lower.match(/facebook\.com\/([a-zA-Z0-9._-]+)/);

    if (pageMatch) {
      handle = pageMatch[1];
    } else if (pMatch) {
      handle = pMatch[1];
    } else if (idMatch) {
      handle = idMatch[1];
    } else if (directMatch) {
      handle = directMatch[1];
    }

    if (!handle || EXCLUDED_FB_HANDLES.has(handle)) return false;

    // Reject file extensions or deep query assets
    if (handle.includes('.php') && !lower.includes('profile.php?id=')) return false;

    return handle.length >= 2 && handle.length <= 80;
  }

  /**
   * Normalizes Facebook profile / business page URL
   * Strips mobile subdomains (m.facebook.com -> www.facebook.com), tracking query params, and trailing slashes
   * @param {string} url
   * @returns {string}
   */
  normalizeProfileUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      let clean = url.trim().split('#')[0];
      // Normalize mobile and country subdomains to www.facebook.com
      clean = clean.replace(/^https?:\/\/(?:[a-z]{2,3}\.|m\.|touch\.|l\.|web\.)?facebook\.com\//i, 'https://www.facebook.com/');
      
      // Keep profile.php?id=... query intact, but strip other tracking params
      if (clean.includes('profile.php?id=')) {
        const idMatch = clean.match(/profile\.php\?id=(\d+)/i);
        if (idMatch) {
          clean = `https://www.facebook.com/profile.php?id=${idMatch[1]}`;
        }
      } else {
        clean = clean.split('?')[0];
      }

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
   * Build targeted X-Ray search query for Facebook business pages & places
   * @param {object|string} opts - Search criteria or raw query
   * @returns {string} Compiled search engine query
   */
  buildXRayQuery(opts) {
    if (!opts) return 'site:facebook.com business -inurl:groups -inurl:posts -inurl:events';

    if (typeof opts === 'string') {
      const trimmed = opts.trim();
      if (!trimmed) return 'site:facebook.com business -inurl:groups -inurl:posts -inurl:events';
      if (trimmed.includes('site:facebook.com')) {
        return trimmed.includes('-inurl:groups') ? trimmed : `${trimmed} -inurl:groups`;
      }
      return `site:facebook.com ${trimmed} -inurl:groups`;
    }

    const category = String(opts.category ?? opts.niche ?? opts.industry ?? '').trim();
    const location = String(opts.location ?? '').trim();
    const bioIntent = String(opts.bioIntent ?? opts.role ?? '').trim();
    const brand = String(opts.brand ?? opts.company ?? '').trim();
    const query = String(opts.query ?? '').trim();

    if (query) {
      if (query.includes('site:facebook.com')) {
        return query.includes('-inurl:groups') ? query : `${query} -inurl:groups`;
      }
      return `site:facebook.com ${query} -inurl:groups`;
    }

    const parts = ['site:facebook.com'];
    if (category) parts.push(category);
    if (location) parts.push(location);
    if (bioIntent) parts.push(bioIntent);
    if (brand) parts.push(brand);
    parts.push('-inurl:groups -inurl:posts');

    if (parts.length <= 2) {
      return 'site:facebook.com business -inurl:groups -inurl:posts -inurl:events';
    }

    return parts.join(' ').trim();
  }

  /**
   * Parse profile details from search result title, URL, and snippet
   * Handles Facebook patterns: "Business Name | City ST - Facebook", "Name - Home | Facebook"
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
      lowerTitle.includes('facebook help center') ||
      lowerTitle.includes('top 10') ||
      lowerTitle.includes('top 20') ||
      lowerTitle.includes('directory')
    ) {
      return null;
    }

    // Extract handle / slug from normalized URL
    let handle = '';
    const idMatch = cleanUrl.match(/profile\.php\?id=(\d+)/i);
    const pMatch = cleanUrl.match(/facebook\.com\/p\/([^/?#]+)/i);
    const directMatch = cleanUrl.match(/facebook\.com\/([^/?#]+)/i);

    if (idMatch) {
      handle = `id_${idMatch[1]}`;
    } else if (pMatch) {
      handle = pMatch[1].toLowerCase();
    } else if (directMatch) {
      handle = directMatch[1].toLowerCase();
    }

    if (!handle || EXCLUDED_FB_HANDLES.has(handle)) {
      return null;
    }

    const registrationNumber = `FB:${handle}`;

    // Clean title suffixes:
    // e.g. "Mia's Brooklyn Bakery | Brooklyn NY - Facebook" -> "Mia's Brooklyn Bakery | Brooklyn NY"
    let cleanTitle = rawTitle
      .replace(/\s*[-|•]\s*Facebook.*$/i, '')
      .replace(/\s*-\s*Home\s*$/i, '')
      .trim();

    // Extract Business Name and optional city/category headline:
    // "Mia's Brooklyn Bakery | Brooklyn NY" -> name: "Mia's Brooklyn Bakery"
    let name = '';
    let categoryHeadline = '';
    const segments = cleanTitle.split(/\s*\|\s*|\s+[-–—]\s+/);
    if (segments.length >= 2) {
      name = segments[0].trim();
      categoryHeadline = segments.slice(1).join(' - ').trim();
    } else {
      name = cleanTitle;
    }

    // Fallback: If name couldn't be parsed or is just "Facebook"
    if (!name || name.length < 2 || name.toLowerCase() === 'facebook') {
      name = handle
        .replace(/[-_.]/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
        .trim();
    }

    if (!name) name = `@${handle}`;

    // Extract Followers / Likes / Check-in metrics from snippet:
    // e.g. "5,022 followers · 81 talking about this · 4,579 were here"
    let followers = '';
    const followersMatch = rawSnippet.match(/([0-9.,]+[KMBkmb]?)\s+(?:followers|likes)/i);
    if (followersMatch) {
      followers = followersMatch[1];
    }

    let companyType = 'Facebook Business Page';
    if (followers) {
      companyType = `Business Page (${followers} Followers)`;
    } else if (categoryHeadline) {
      companyType = categoryHeadline;
    }

    // Extract physical address & location from snippet:
    // e.g. "930 Washington Ave #203, Miami Beach, FL, United States, 33019" or "Brooklyn, NY"
    let location = defaultLocation;
    const fullAddressMatch = rawSnippet.match(/\b\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Beach|Suite|Ste|#\d+)[A-Za-z0-9\s,.-]+\b\d{5}\b/i);
    if (fullAddressMatch) {
      location = fullAddressMatch[0].trim();
    } else {
      const pinMatch = rawSnippet.match(/📍\s*([^·•\n"|]+)/);
      if (pinMatch) {
        location = pinMatch[1].trim();
      } else {
        const locMatch = rawSnippet.match(/(?:Location:\s*|in\s+)?([A-Za-z\s]+(?:,\s*[A-Za-z\s]+){1,2})/);
        if (locMatch && !location) {
          location = locMatch[1].trim();
        }
      }
    }

    // De-obfuscate text before scanning contacts
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

    // Extract public telephone numbers / WhatsApp
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

    // Extract external company website from page snippet for website contact enrichment
    let companyDomain = '';
    const domainMatch = (rawSnippet + ' ' + rawTitle).match(
      /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|io|ai|co|store|shop|me|site|tech|dev|app|in|uk|us|ca|au))\b/i
    );
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase().trim();
      if (!domain.includes('facebook.com') && !domain.includes('fb.com') && !domain.includes('instagram.com') && !domain.includes('meta.com')) {
        companyDomain = `https://${domain}`;
      }
    }

    return {
      company_name: name,
      director: name,
      company_type: companyType,
      website: cleanUrl,
      registration_number: registrationNumber,
      status: 'Active',
      address: location || 'United States',
      city: city || 'San Francisco',
      country: country || 'United States',
      postal_code: postalCode,
      industry: 'Local Business & Services',
      email: email,
      phone: phone,
      company_domain: companyDomain,
      source: 'Facebook'
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
          if (urlText.includes('facebook.com/')) {
            cleanUrl = 'https://' + urlText.replace(/^https?:\/\//, '');
          }
        }

        if (this.isProfileUrl(cleanUrl) && title) {
          const parsed = this.parseProfileFromSnippet(title, cleanUrl, snippet);
          if (parsed) leads.push(parsed);
        }
      });
    } catch (err) {
      console.warn('[FacebookConnector] DuckDuckGo HTTP search error:', err.message);
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
      console.warn('[FacebookConnector] Bing HTTP search fallback error:', err.message);
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
      console.warn('[FacebookConnector] Puppeteer search error, falling back to HTTP:', err.message);
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

export const facebookConnector = new FacebookConnector();
