// lib/services/enrichment.js
// Scrapes verified company websites for publicly listed email and phone contacts
// Strictly adheres to compliance rules: NEVER guesses or invents emails

import * as cheerio from 'cheerio';
import { config } from '../config.js';

export class EnrichmentService {
  constructor() {
    this.userAgent = config.scraper.userAgent;
    this.timeoutMs = 8000;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPage(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  extractContactsFromHtml(html, baseUrl) {
    if (!html) return { emails: [], phones: [], contactLinks: [] };
    const $ = cheerio.load(html);
    const emails = new Set();
    const phones = new Set();
    const contactLinks = new Set();

    // 1. Mailto links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const email = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
      if (email && email.includes('@') && !email.includes('example.com')) {
        emails.add(email);
      }
    });

    // 2. Tel links
    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const phone = href.replace(/^tel:/i, '').trim();
      if (phone.length >= 6) {
        phones.add(phone);
      }
    });

    // 3. Scan visible text for email addresses
    const text = $('body').text() || '';
    const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    for (const em of emailMatches) {
      const cleaned = em.trim().toLowerCase();
      if (!/\.(png|jpg|jpeg|gif|svg|webp|js|css)$/i.test(cleaned) && !cleaned.includes('example.com') && !cleaned.includes('sentry.io')) {
        emails.add(cleaned);
      }
    }

    // 4. Discover contact/about links on homepage
    if (baseUrl) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const linkText = $(el).text().toLowerCase();
        if (/contact|about|touch|reach/i.test(href) || /contact|about us/i.test(linkText)) {
          try {
            const absolute = new URL(href, baseUrl).toString();
            if (absolute.startsWith('http')) {
              contactLinks.add(absolute);
            }
          } catch {
            // ignore malformed URLs
          }
        }
      });
    }

    return {
      emails: Array.from(emails),
      phones: Array.from(phones),
      contactLinks: Array.from(contactLinks).slice(0, 3)
    };
  }

  /**
   * Enrich a company record by crawling its website
   * @param {object} lead - lead object with website
   * @returns {Promise<{email: string, phone: string, status: string}>}
   */
  async enrichLead(lead) {
    if (!lead.website || !lead.website.startsWith('http')) {
      return {
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.email ? 'enriched' : 'not_found'
      };
    }

    try {
      // 1. Fetch homepage
      const homepageHtml = await this.fetchPage(lead.website);
      if (!homepageHtml) {
        return { email: lead.email || '', phone: lead.phone || '', status: 'failed' };
      }

      const initial = this.extractContactsFromHtml(homepageHtml, lead.website);
      let foundEmail = initial.emails[0] || lead.email || '';
      let foundPhone = initial.phones[0] || lead.phone || '';

      // 2. If contacts missing, check the first contact page
      if ((!foundEmail || !foundPhone) && initial.contactLinks.length > 0) {
        await this.sleep(1000); // polite pause
        const contactPageHtml = await this.fetchPage(initial.contactLinks[0]);
        if (contactPageHtml) {
          const contactPage = this.extractContactsFromHtml(contactPageHtml, lead.website);
          if (!foundEmail && contactPage.emails.length > 0) {
            foundEmail = contactPage.emails[0];
          }
          if (!foundPhone && contactPage.phones.length > 0) {
            foundPhone = contactPage.phones[0];
          }
        }
      }

      const enriched = Boolean(foundEmail || foundPhone);
      return {
        email: foundEmail,
        phone: foundPhone,
        status: enriched ? 'enriched' : 'not_found'
      };
    } catch {
      return { email: lead.email || '', phone: lead.phone || '', status: 'failed' };
    }
  }
}

export const enrichment = new EnrichmentService();
