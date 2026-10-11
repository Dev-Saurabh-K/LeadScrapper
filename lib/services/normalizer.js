// lib/services/normalizer.js
// Standardizes company records, cleans contact info, and performs de-duplication

import { LeadSchema } from '../models.js';
import { db } from '../database.js';

export class NormalizerService {
  /**
   * Clean and normalize raw company name
   * @param {string} rawName 
   * @returns {string}
   */
  normalizeCompanyName(rawName) {
    if (!rawName) return '';
    return rawName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^["']+|["']+$/g, '');
  }

  /**
   * Clean and normalize phone number
   * @param {string} rawPhone 
   * @returns {string}
   */
  normalizePhone(rawPhone) {
    if (!rawPhone) return '';
    const cleaned = rawPhone.trim().replace(/[^\d+()-\s]/g, '').replace(/\s+/g, ' ');
    // Ignore absurdly short or long strings
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 6 || digitsOnly.length > 16) {
      return '';
    }
    return cleaned;
  }

  /**
   * Validate and clean email address (strict compliance)
   * @param {string} rawEmail 
   * @returns {string}
   */
  normalizeEmail(rawEmail) {
    if (!rawEmail) return '';
    const trimmed = rawEmail.trim().toLowerCase();
    
    // Discard false positives from scraping (e.g., logo.png@2x, file.pdf)
    if (/\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2)$/i.test(trimmed)) {
      return '';
    }

    // Strict email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return '';
    }

    // Filter out common dummy or placeholder patterns
    const dummyDomains = ['example.com', 'test.com', 'sample.org', 'domain.com', 'yourcompany.com'];
    const domain = trimmed.split('@')[1];
    if (dummyDomains.includes(domain)) {
      return '';
    }

    return trimmed;
  }

  /**
   * Normalize and validate a lead record against schema
   * @param {object} rawLead 
   * @returns {object} validated and sanitized lead
   */
  normalizeLead(rawLead) {
    const sanitized = {
      company_name: this.normalizeCompanyName(rawLead.company_name),
      registration_number: (rawLead.registration_number || '').trim(),
      country: (rawLead.country || '').trim(),
      status: (rawLead.status || 'Active').trim(),
      incorporation_date: (rawLead.incorporation_date || '').trim(),
      company_type: (rawLead.company_type || '').trim(),
      address: (rawLead.address || '').trim(),
      city: (rawLead.city || '').trim(),
      postal_code: (rawLead.postal_code || '').trim(),
      director: (rawLead.director || '').trim(),
      website: (rawLead.website || '').trim(),
      email: this.normalizeEmail(rawLead.email),
      phone: this.normalizePhone(rawLead.phone),
      industry: (rawLead.industry || '').trim(),
      source: rawLead.source || 'Registry API',
      enrichment_status: rawLead.enrichment_status || 'pending'
    };

    // Validate with Zod
    const result = LeadSchema.safeParse(sanitized);
    if (!result.success) {
      throw new Error(`Lead validation failed: ${result.error.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }

  /**
   * Check if a lead is a duplicate in the database
   * @param {object} lead 
   * @returns {Promise<{isDuplicate: boolean, existingId?: string, matchField?: string}>}
   */
  async checkDuplicate(lead) {
    return await db.findDuplicate(lead.country, lead.registration_number, lead.company_name);
  }
}

export const normalizer = new NormalizerService();
