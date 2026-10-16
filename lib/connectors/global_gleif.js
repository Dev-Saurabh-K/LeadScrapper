// lib/connectors/global_gleif.js
// Global Legal Entity Identifier Foundation (GLEIF) Open Data Connector
// Free, public REST API — No API key required
// Accesses official ISO 17442 Legal Entity Identifiers across 2.6M+ corporate entities globally

import { BaseConnector } from './base.js';

const ISO2_COUNTRY_MAP = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  NO: 'Norway',
  SG: 'Singapore',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  NL: 'Netherlands',
  CH: 'Switzerland',
  IN: 'India',
  SE: 'Sweden',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  ES: 'Spain',
  IT: 'Italy',
  LU: 'Luxembourg',
  HK: 'Hong Kong',
  BR: 'Brazil',
  MX: 'Mexico',
  ZA: 'South Africa',
  NZ: 'New Zealand',
  PL: 'Poland',
  AT: 'Austria',
  BE: 'Belgium'
};

export class GlobalGleifConnector extends BaseConnector {
  constructor() {
    super('GLOBAL', 'Global', 'GLEIF Legal Entity Registry', false);
  }

  async search(query = '', limit = 20) {
    const totalLimit = Math.min(Math.max(limit, 1), 100);
    const leads = [];
    const seenNames = new Set();
    const seenLeis = new Set();
    const cleanQ = query && query.trim() ? query.trim() : '';

    let url = `https://api.gleif.org/api/v1/lei-records?page[size]=${totalLimit}`;
    if (cleanQ) {
      url += `&filter[fulltext]=${encodeURIComponent(cleanQ)}`;
    }

    try {
      let response = await this.safeFetch(url, {}, 2);
      let records = response?.data || [];

      // Fallback if fulltext filter returned 0 records
      if (records.length === 0 && cleanQ) {
        const fallbackUrl = `https://api.gleif.org/api/v1/lei-records?page[size]=${totalLimit}`;
        const fallbackRes = await this.safeFetch(fallbackUrl, {}, 2);
        records = fallbackRes?.data || [];
      }

      for (const item of records) {
        const attr = item?.attributes || {};
        const entity = attr.entity || {};
        const legalAddress = entity.legalAddress || entity.headquartersAddress || {};
        const lei = attr.lei || item.id || '';
        const name = (entity.legalName?.name || '').trim();

        if (!name || seenNames.has(name.toLowerCase()) || (lei && seenLeis.has(lei))) continue;
        seenNames.add(name.toLowerCase());
        if (lei) seenLeis.add(lei);

        const isoCountry = (legalAddress.country || '').toUpperCase();
        const countryName = ISO2_COUNTRY_MAP[isoCountry] || (isoCountry ? `Country (${isoCountry})` : 'Global');
        const city = (legalAddress.city || '').trim();
        const postalCode = (legalAddress.postalCode || '').trim();
        const addressLines = (legalAddress.addressLines || []).filter(Boolean).join(', ');
        const fullAddress = [addressLines, city, isoCountry].filter(Boolean).join(', ');
        const status = entity.status === 'ACTIVE' ? 'Active' : (entity.status || 'Active');
        const regDate = attr.registration?.initialRegistrationDate ? attr.registration.initialRegistrationDate.split('T')[0] : '';
        const category = entity.category ? entity.category.replace(/_/g, ' ') : 'Corporate Entity';

        leads.push({
          company_name: name,
          registration_number: lei,
          country: countryName,
          status: status,
          incorporation_date: regDate,
          company_type: category,
          address: fullAddress || city || countryName,
          city: city || 'Global Office',
          postal_code: postalCode,
          director: 'Registered Entity Representative',
          website: '',
          email: '',
          phone: '',
          industry: `LEI ISO 17442 (${category})`,
          source: 'GLEIF Legal Entity Registry',
          enrichment_status: 'pending'
        });

        if (leads.length >= totalLimit) break;
      }
    } catch (err) {
      console.warn(`[GLEIF Connector] Query failed: ${err.message}`);
    }

    return leads;
  }
}

export const gleifConnector = new GlobalGleifConnector();
