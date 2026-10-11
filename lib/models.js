// lib/models.js
// Zod schemas for runtime validation of leads, scrape jobs, and API payloads

import { z } from 'zod';

export const LeadSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().min(1, 'Company name is required'),
  registration_number: z.string().nullable().optional().default(''),
  country: z.string().min(1, 'Country is required'),
  status: z.string().nullable().optional().default('Active'),
  incorporation_date: z.string().nullable().optional().default(''),
  company_type: z.string().nullable().optional().default(''),
  address: z.string().nullable().optional().default(''),
  city: z.string().nullable().optional().default(''),
  postal_code: z.string().nullable().optional().default(''),
  director: z.string().nullable().optional().default(''),
  website: z.string().nullable().optional().default(''),
  email: z.string().nullable().optional().default(''),
  phone: z.string().nullable().optional().default(''),
  industry: z.string().nullable().optional().default(''),
  source: z.string().default('Registry API'),
  enrichment_status: z.enum(['pending', 'enriched', 'failed', 'not_found']).default('pending'),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export const ScrapeRequestSchema = z.object({
  countries: z.array(z.string()).min(1, 'Select at least one country'),
  query: z.string().optional().default(''),
  limit: z.number().int().min(1).max(200).optional().default(20),
  enrich: z.boolean().optional().default(false),
  delayMs: z.number().int().min(200).max(10000).optional().default(1000)
});

export const ScrapeJobSchema = z.object({
  id: z.string().uuid(),
  countries: z.array(z.string()),
  status: z.enum(['running', 'completed', 'failed']).default('running'),
  leads_collected: z.number().int().default(0),
  duplicates_skipped: z.number().int().default(0),
  errors_count: z.number().int().default(0),
  started_at: z.string(),
  finished_at: z.string().nullable().optional(),
  logs: z.array(z.object({
    timestamp: z.string(),
    level: z.enum(['info', 'warn', 'error', 'success']),
    message: z.string()
  })).default([]),
  summary: z.string().nullable().optional()
});
