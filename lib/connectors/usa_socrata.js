// lib/connectors/usa_socrata.js
// USA Public Registry Connector (Colorado Secretary of State & Socrata Open Data)
// Free JSON API - Commercial use allowed - No API key required

import { BaseConnector } from './base.js';

export class UsaSocrataConnector extends BaseConnector {
  constructor() {
    super('US', 'United States', 'US Socrata Open Data (Colorado & NY)', false);
  }

  async search(query = '', limit = 20) {
    const size = Math.min(Math.max(limit, 1), 50);
    let url = `https://data.colorado.gov/resource/4ykn-tg5h.json?entitystatus=Good%20Standing&$limit=${size}`;
    if (query && query.trim()) {
      url += `&$q=${encodeURIComponent(query.trim())}`;
    }

    const records = await this.safeFetch(url);

    const leads = [];
    for (const item of (records || [])) {
      const street = item.principaladdress1 || '';
      const city = item.principalcity || '';
      const state = item.principalstate || 'CO';
      const zip = item.principalzipcode || '';
      const fullAddress = [street, city, state, zip, 'USA'].filter(Boolean).join(', ');

      // Agent / Director
      const agentParts = [item.agentfirstname, item.agentmiddlename, item.agentlastname].filter(Boolean);
      const agent = agentParts.length > 0 ? `${agentParts.join(' ')} (Registered Agent)` : '';

      leads.push({
        company_name: item.entityname || '',
        registration_number: item.entityid || '',
        country: 'United States',
        status: item.entitystatus === 'Good Standing' ? 'Active' : (item.entitystatus || 'Active'),
        incorporation_date: item.entityformdate ? item.entityformdate.split('T')[0] : '',
        company_type: item.entitytype || 'LLC/Corp',
        address: fullAddress || '',
        city: city || '',
        postal_code: zip || '',
        director: agent || '',
        website: '',
        email: '',
        phone: '',
        industry: item.jurisdictonofformation ? `Jurisdiction: ${item.jurisdictonofformation}` : '',
        source: this.registryName,
        enrichment_status: 'pending'
      });
    }

    return leads;
  }
}

export const usaConnector = new UsaSocrataConnector();
