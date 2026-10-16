// lib/connectors/usa_socrata.js
// USA Multi-Source Public Registry Connector
// Aggregates Colorado Secretary of State (data.colorado.gov) and New York City Open Data (data.cityofnewyork.us)
// Free JSON Open Data APIs - No API keys required

import { BaseConnector } from './base.js';

export class UsaSocrataConnector extends BaseConnector {
  constructor() {
    super('US', 'United States', 'US Socrata Open Data (Colorado & New York)', false);
  }

  async search(query = '', limit = 20) {
    const totalLimit = Math.min(Math.max(limit, 1), 100);
    const halfLimit = Math.ceil(totalLimit / 2);
    const leads = [];
    const seenNames = new Set();

    // 1. Primary Source: Colorado Socrata Open Data
    try {
      let urlCO = `https://data.colorado.gov/resource/4ykn-tg5h.json?entitystatus=Good%20Standing&$limit=${halfLimit}`;
      if (query && query.trim()) {
        urlCO += `&$q=${encodeURIComponent(query.trim())}`;
      }
      const recordsCO = await this.safeFetch(urlCO, {}, 2);

      for (const item of (recordsCO || [])) {
        const name = (item.entityname || '').trim();
        if (!name || seenNames.has(name.toLowerCase())) continue;
        seenNames.add(name.toLowerCase());

        const street = item.principaladdress1 || '';
        const city = item.principalcity || '';
        const state = item.principalstate || 'CO';
        const zip = item.principalzipcode || '';
        const fullAddress = [street, city, state, zip, 'USA'].filter(Boolean).join(', ');

        const agentParts = [item.agentfirstname, item.agentmiddlename, item.agentlastname].filter(Boolean);
        const agent = agentParts.length > 0 ? `${agentParts.join(' ')} (Registered Agent)` : '';

        leads.push({
          company_name: name,
          registration_number: item.entityid || '',
          country: 'United States',
          status: item.entitystatus === 'Good Standing' ? 'Active' : (item.entitystatus || 'Active'),
          incorporation_date: item.entityformdate ? item.entityformdate.split('T')[0] : '',
          company_type: item.entitytype || 'LLC/Corp',
          address: fullAddress || '',
          city: city || 'Denver',
          postal_code: zip || '',
          director: agent || '',
          website: '',
          email: '',
          phone: '',
          industry: item.jurisdictonofformation ? `Jurisdiction: ${item.jurisdictonofformation}` : 'Commercial Enterprise',
          source: 'Colorado Socrata Open Data',
          enrichment_status: 'pending'
        });
      }
    } catch (err) {
      console.warn(`[USA Connector:CO] Colorado query failed (${err.message}). Continuing with NY source.`);
    }

    // 2. Secondary Source for Same Location: New York City Legally Operating Businesses
    const remainingQuota = totalLimit - leads.length;
    if (remainingQuota > 0) {
      try {
        let urlNY = `https://data.cityofnewyork.us/resource/w7w3-xahh.json?license_status=Active&$limit=${remainingQuota}`;
        if (query && query.trim()) {
          const cleanQ = query.trim().toLowerCase();
          urlNY = `https://data.cityofnewyork.us/resource/w7w3-xahh.json?license_status=Active&$where=lower(business_name)+like+%27%25${encodeURIComponent(cleanQ)}%25%27&$limit=${remainingQuota}`;
        }

        const recordsNY = await this.safeFetch(urlNY, {}, 2);

        for (const item of (recordsNY || [])) {
          const name = (item.business_name || item.business_name_2 || '').trim();
          if (!name || seenNames.has(name.toLowerCase())) continue;
          seenNames.add(name.toLowerCase());

          const street = [item.address_building, item.address_street_name].filter(Boolean).join(' ');
          const borough = item.address_borough || '';
          const city = item.address_city || borough || 'New York';
          const state = item.address_state || 'NY';
          const zip = item.address_zip || '';
          const fullAddress = [street, borough, city, state, zip, 'USA'].filter(Boolean).join(', ');

          // Format contact phone if available
          let phone = (item.contact_phone || '').trim();
          if (phone && phone.length === 10 && !phone.startsWith('+')) {
            phone = `+1 (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
          }

          leads.push({
            company_name: name,
            registration_number: item.business_unique_id || item.license_nbr || '',
            country: 'United States',
            status: item.license_status === 'Active' ? 'Active' : (item.license_status || 'Active'),
            incorporation_date: item.license_creation_date ? item.license_creation_date.split('T')[0] : '',
            company_type: item.license_type ? `${item.license_type} License` : 'Corporation',
            address: fullAddress || '',
            city: city,
            postal_code: zip,
            director: '',
            website: '',
            email: '',
            phone: phone,
            industry: item.business_category || 'Commercial Enterprise',
            source: 'New York Open Data',
            enrichment_status: phone ? 'enriched' : 'pending'
          });

          if (leads.length >= totalLimit) break;
        }
      } catch (err) {
        console.warn(`[USA Connector:NY] New York query failed (${err.message}).`);
      }
    }

    return leads.slice(0, totalLimit);
  }
}

export const usaConnector = new UsaSocrataConnector();
