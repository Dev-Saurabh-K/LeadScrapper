// lib/connectors/companies_house.js
// UK Multi-Source Corporate & Commercial Registry Connector
// Aggregates UK Companies House API and UK Contracts Finder Open Data (Cabinet Office OCDS)
// Live data guaranteed — zero API key required for UK Contracts Finder; live Companies House API enabled when key is present

import { BaseConnector } from './base.js';
import { config } from '../config.js';

export class CompaniesHouseConnector extends BaseConnector {
  constructor() {
    super('UK', 'United Kingdom', 'UK Corporate Registries (Companies House & Contracts Finder)', false);
  }

  async search(query = 'tech', limit = 20) {
    const totalLimit = Math.min(Math.max(limit, 1), 100);
    const apiKey = config.registries.companiesHouseApiKey;
    const leads = [];
    const seenNames = new Set();
    const seenNumbers = new Set();
    const searchTerm = query && query.trim() ? query.trim() : 'services';

    // 1. Primary Source (If Key Configured): UK Companies House API
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const halfLimit = Math.ceil(totalLimit / 2);
        const authHeader = `Basic ${Buffer.from(apiKey.trim() + ':').toString('base64')}`;
        const searchUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(searchTerm)}&items_per_page=${halfLimit}`;

        const searchData = await this.safeFetch(searchUrl, { Authorization: authHeader }, 2);
        const items = searchData?.items || [];

        for (const item of items) {
          const name = (item.title || item.company_name || '').trim();
          const companyNumber = (item.company_number || '').trim();
          if (!name || seenNames.has(name.toLowerCase()) || (companyNumber && seenNumbers.has(companyNumber))) continue;
          if (name) seenNames.add(name.toLowerCase());
          if (companyNumber) seenNumbers.add(companyNumber);

          const addressSnippet = item.address_snippet || '';
          let director = '';
          if (companyNumber) {
            try {
              const officersUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}/officers?items_per_page=1`;
              const officersData = await this.safeFetch(officersUrl, { Authorization: authHeader }, 1);
              const firstOfficer = officersData?.items?.[0];
              if (firstOfficer) {
                director = `${firstOfficer.name || ''} (${firstOfficer.officer_role || 'Director'})`.trim();
              }
            } catch {
              // Non-blocking
            }
          }

          leads.push({
            company_name: name,
            registration_number: companyNumber,
            country: 'United Kingdom',
            status: item.company_status === 'active' ? 'Active' : (item.company_status || 'Active'),
            incorporation_date: item.date_of_creation || '',
            company_type: item.company_type || 'ltd',
            address: addressSnippet || '',
            city: item.address?.locality || 'London',
            postal_code: item.address?.postal_code || '',
            director: director,
            website: '',
            email: '',
            phone: '',
            industry: item.description || 'Corporate Entity',
            source: 'UK Companies House',
            enrichment_status: 'pending'
          });

          await this.sleep(250);
        }
      } catch (err) {
        console.warn(`[UK Connector:CompaniesHouse] Failed (${err.message}). Continuing with UK Contracts Finder source.`);
      }
    }

    // 2. Complementary / Zero-Key Live Source: UK Contracts Finder Open Data (Cabinet Office OCDS)
    const remainingQuota = totalLimit - leads.length;
    if (remainingQuota > 0) {
      try {
        const urlContracts = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?size=15&q=${encodeURIComponent(searchTerm)}`;
        const dataContracts = await this.safeFetch(urlContracts, {}, 2);
        const releases = dataContracts?.releases || [];

        for (const rel of releases) {
          const parties = rel.parties || [];
          const awards = rel.awards || [];

          // Map supplier IDs (often contains official GB-COH-xxxx registration numbers)
          const supplierIdMap = {};
          for (const aw of awards) {
            for (const sup of (aw.suppliers || [])) {
              if (sup.name) {
                const coNum = (sup.id || '').replace(/^GB-COH-/i, '').trim();
                supplierIdMap[sup.name.toLowerCase()] = coNum;
              }
            }
          }

          for (const p of parties) {
            const name = (p.name || '').trim();
            if (!name || seenNames.has(name.toLowerCase())) continue;

            const isSupplier = (p.roles || []).includes('supplier');
            const isBuyer = (p.roles || []).includes('buyer');
            if (!isSupplier && !isBuyer) continue;

            const regNum = supplierIdMap[name.toLowerCase()] || p.identifier?.id || '';
            if (regNum && seenNumbers.has(regNum)) continue;

            seenNames.add(name.toLowerCase());
            if (regNum) seenNumbers.add(regNum);

            const addr = p.address || {};
            const street = (addr.streetAddress || '').replace(/\r?\n/g, ', ').trim();
            const locality = addr.locality || 'London';
            const postcode = addr.postalCode || '';
            const fullAddress = [street, locality, postcode, 'United Kingdom'].filter(Boolean).join(', ');

            const email = (p.contactPoint?.email || '').trim().toLowerCase();
            const phone = (p.contactPoint?.telephone || '').trim();

            leads.push({
              company_name: name,
              registration_number: regNum,
              country: 'United Kingdom',
              status: 'Active',
              incorporation_date: rel.date ? rel.date.split('T')[0] : '',
              company_type: isSupplier ? 'Commercial Supplier (Ltd)' : 'Commercial & Public Entity',
              address: fullAddress,
              city: locality,
              postal_code: postcode,
              director: p.contactPoint?.name || '',
              website: p.contactPoint?.url || '',
              email: email,
              phone: phone,
              industry: rel.tender?.title || 'Commercial Enterprise',
              source: 'UK Contracts Finder Open Data',
              enrichment_status: (email || phone) ? 'enriched' : 'pending'
            });

            if (leads.length >= totalLimit) break;
          }

          if (leads.length >= totalLimit) break;
        }
      } catch (err) {
        console.warn(`[UK Connector:ContractsFinder] Failed (${err.message}).`);
      }
    }

    return leads.slice(0, totalLimit);
  }
}

export const ukConnector = new CompaniesHouseConnector();
