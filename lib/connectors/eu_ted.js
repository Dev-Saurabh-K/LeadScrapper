// lib/connectors/eu_ted.js
// European Union Public Procurement & Contract Awards Connector (Tenders Electronic Daily / eForms)
// Free, public REST API v3 — No API key required
// Accesses millions of EU public tenders, procurement notices, and awarded contractors with direct contact details

import { BaseConnector } from './base.js';

const EU_COUNTRY_MAP = {
  AUT: 'Austria',
  BEL: 'Belgium',
  BGR: 'Bulgaria',
  HRV: 'Croatia',
  CYP: 'Cyprus',
  CZE: 'Czech Republic',
  DNK: 'Denmark',
  EST: 'Estonia',
  FIN: 'Finland',
  FRA: 'France',
  DEU: 'Germany',
  GRC: 'Greece',
  HUN: 'Hungary',
  IRL: 'Ireland',
  ITA: 'Italy',
  LVA: 'Latvia',
  LTU: 'Lithuania',
  LUX: 'Luxembourg',
  MLT: 'Malta',
  NLD: 'Netherlands',
  POL: 'Poland',
  PRT: 'Portugal',
  ROU: 'Romania',
  SVK: 'Slovakia',
  SVN: 'Slovenia',
  ESP: 'Spain',
  SWE: 'Sweden',
  NOR: 'Norway',
  GBR: 'United Kingdom',
  CHE: 'Switzerland'
};

export class EuTedConnector extends BaseConnector {
  constructor() {
    super('EU', 'European Union', 'EU TED Public Procurement (eForms)', false);
  }

  /**
   * Helper to extract a human-readable string from TED's multilingual object
   * e.g. { eng: ['Value'], fra: ['Autre'] } or { deu: 'Wert' }
   */
  _extractMultilingual(val) {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) {
      return (val[0] ? String(val[0]).trim() : '');
    }
    if (typeof val === 'object') {
      // Prefer English, then take first available language value
      if (val.eng) {
        return Array.isArray(val.eng) ? String(val.eng[0] || '').trim() : String(val.eng).trim();
      }
      for (const k of Object.keys(val)) {
        const item = val[k];
        if (Array.isArray(item) && item[0]) return String(item[0]).trim();
        if (typeof item === 'string' && item.trim()) return item.trim();
      }
    }
    return '';
  }

  async search(query = '', limit = 20) {
    const totalLimit = Math.min(Math.max(limit, 1), 100);
    const leads = [];
    const seenNames = new Set();
    const cleanQ = query ? query.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '') : '';

    const fields = [
      'ND',
      'notice-title',
      'publication-date',
      'winner-name',
      'winner-country',
      'winner-city',
      'winner-touchpoint-email',
      'winner-internet-address',
      'organisation-email-buyer',
      'buyer-name',
      'buyer-country',
      'buyer-city'
    ];

    // Build query expression
    let tedQuery = 'publication-date >= 20240101 AND winner-name = *';
    if (cleanQ) {
      tedQuery = `publication-date >= 20240101 AND (notice-title = ${cleanQ}* OR winner-name = ${cleanQ}*)`;
    }

    try {
      const responseData = await this.safePost(
        'https://api.ted.europa.eu/v3/notices/search',
        {
          query: tedQuery,
          fields: fields,
          page: 1,
          limit: totalLimit
        },
        {},
        2
      );

      let notices = responseData?.notices || [];

      // Fallback query if specific search yielded zero results
      if (notices.length === 0 && cleanQ) {
        const fallbackData = await this.safePost(
          'https://api.ted.europa.eu/v3/notices/search',
          {
            query: 'publication-date >= 20240101 AND winner-name = *',
            fields: fields,
            page: 1,
            limit: totalLimit
          },
          {},
          2
        );
        notices = fallbackData?.notices || [];
      }

      for (const item of notices) {
        const winnerName = this._extractMultilingual(item['winner-name']);
        const buyerName = this._extractMultilingual(item['buyer-name']);
        const companyName = winnerName || buyerName;

        if (!companyName || seenNames.has(companyName.toLowerCase())) continue;
        seenNames.add(companyName.toLowerCase());

        // Extract country
        const rawCountryCode = (item['winner-country']?.[0] || item['buyer-country']?.[0] || 'EU').toUpperCase();
        const friendlyCountry = EU_COUNTRY_MAP[rawCountryCode] || 'European Union';

        // Extract city
        const city = this._extractMultilingual(item['winner-city']) || this._extractMultilingual(item['buyer-city']) || 'Brussels';

        // Extract email
        let email = '';
        if (item['winner-touchpoint-email']) {
          email = this._extractMultilingual(item['winner-touchpoint-email']);
        } else if (item['organisation-email-buyer'] && item['organisation-email-buyer'][0]) {
          email = String(item['organisation-email-buyer'][0]).trim();
        }

        // Extract website
        let website = '';
        if (item['winner-internet-address']) {
          website = this._extractMultilingual(item['winner-internet-address']);
        }

        // Extract title / industry
        const title = this._extractMultilingual(item['notice-title']) || 'Public Procurement Contractor';
        const pubDate = item['publication-date'] ? item['publication-date'].split('+')[0].split('T')[0] : '';
        const noticeId = item['ND'] || item['publication-number'] || '';

        leads.push({
          company_name: companyName,
          registration_number: noticeId ? `TED-${noticeId}` : '',
          country: friendlyCountry,
          status: 'Active',
          incorporation_date: pubDate,
          company_type: winnerName ? 'Awarded Contractor' : 'Procuring Entity',
          address: `${city}, ${friendlyCountry}`,
          city: city,
          postal_code: '',
          director: winnerName ? 'Contract Winner Representative' : 'Procurement Officer',
          website: website,
          email: email,
          phone: '',
          industry: title.length > 80 ? `${title.slice(0, 77)}...` : title,
          source: 'EU TED Procurement (eForms)',
          enrichment_status: email ? 'enriched' : 'pending'
        });

        if (leads.length >= totalLimit) break;
      }
    } catch (err) {
      console.warn(`[EU TED Connector] Query failed: ${err.message}`);
    }

    return leads;
  }
}

export const euConnector = new EuTedConnector();
