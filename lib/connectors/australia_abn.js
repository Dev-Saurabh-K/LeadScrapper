// lib/connectors/australia_abn.js
// Australia Business Register (ABN Lookup) Connector
// A free ABN Lookup web-services GUID is required for live registry access.

import { BaseConnector } from './base.js';
import { config } from '../config.js';

function getMatchingNames(payload) {
  const names = payload?.Names ?? payload?.names ?? payload?.MatchingNames ?? payload?.matchingNames ?? [];
  return Array.isArray(names) ? names : [];
}

function toAustralianLead(match, registryName) {
  const companyName = String(match?.Name ?? match?.name ?? match?.MatchingName ?? '').trim();
  const registrationNumber = String(match?.Abn ?? match?.ABN ?? match?.abn ?? '').trim();

  if (!companyName || !registrationNumber) return null;

  const state = String(match?.State ?? match?.state ?? '').trim();
  const postalCode = String(match?.Postcode ?? match?.postcode ?? '').trim();
  const status = String(match?.Status ?? match?.status ?? match?.AbnStatus ?? match?.ABNStatus ?? 'Active').trim();

  return {
    company_name: companyName,
    registration_number: registrationNumber,
    country: 'Australia',
    status,
    incorporation_date: '',
    company_type: '',
    address: [state, postalCode, 'Australia'].filter(Boolean).join(', '),
    city: state,
    postal_code: postalCode,
    director: '',
    website: '',
    email: '',
    phone: '',
    industry: 'Australian business',
    source: registryName,
    enrichment_status: 'pending'
  };
}

export class AustraliaAbnConnector extends BaseConnector {
  constructor() {
    super('AU', 'Australia', 'Australian Business Register (ABN Lookup)', true);
  }

  async search(query = '', limit = 20) {
    const size = Math.min(Math.max(limit, 1), 50);
    const guid = config.registries.abnLookupGuid.trim();

    if (!guid) {
      throw new Error('[AU] ABN_LOOKUP_GUID is required for live Australia Business Register searches.');
    }

    const searchTerm = query && query.trim() ? query.trim() : 'technology';
    const url = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(searchTerm)}&maxResults=${size}&guid=${encodeURIComponent(guid)}`;
    const payload = await this.safeFetch(url);
    const matches = getMatchingNames(payload);

    if (matches.length === 0 && payload?.Message) {
      throw new Error(`[AU] ABN Lookup returned: ${payload.Message}`);
    }

    return matches
      .map((match) => toAustralianLead(match, this.registryName))
      .filter(Boolean)
      .slice(0, size);
  }
}

export const australiaConnector = new AustraliaAbnConnector();
