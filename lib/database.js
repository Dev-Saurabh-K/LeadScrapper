// lib/database.js
// Dual-mode database layer: Supabase PostgreSQL (via pg Pool / Supabase SDK) with automated Local Fallback

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const { Pool } = pg;
const DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const LOCAL_JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

function ensureLocalDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_LEADS_FILE)) {
    fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(LOCAL_JOBS_FILE)) {
    fs.writeFileSync(LOCAL_JOBS_FILE, JSON.stringify([], null, 2));
  }
}

class DatabaseService {
  constructor() {
    this.pool = null;
    this.supabaseClient = null;
    this.usePostgres = false;
    this.initClients();
  }

  initClients() {
    // 1. Direct PostgreSQL Connection Pool
    if (config.supabase.databaseUrl) {
      try {
        this.pool = new Pool({
          connectionString: config.supabase.databaseUrl,
          ssl: { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000
        });
        this.usePostgres = true;
      } catch (err) {
        console.warn('[DB] PostgreSQL pool initialization error:', err.message);
        this.pool = null;
      }
    }

    // 2. Supabase SDK Client
    if (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)) {
      try {
        const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
        this.supabaseClient = createClient(config.supabase.url, key, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      } catch (err) {
        this.supabaseClient = null;
      }
    }

    ensureLocalDir();
  }

  async checkStatus() {
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT 1 FROM leads LIMIT 1');
        return {
          mode: 'supabase',
          status: 'connected',
          message: 'Supabase PostgreSQL connected & tables verified via direct connection pool'
        };
      } catch (err) {
        // continue to check fallback
      }
    }

    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient.from('leads').select('id').limit(1);
        if (!error) {
          return {
            mode: 'supabase',
            status: 'connected',
            message: 'Supabase PostgreSQL connected via API client'
          };
        }
      } catch {
        // continue to local
      }
    }

    return {
      mode: 'local',
      status: 'ready',
      message: 'Local storage active (.data/)'
    };
  }

  // --- LEADS OPERATIONS ---

  async getAllLeads(filter = {}) {
    if (this.pool) {
      try {
        let query = 'SELECT * FROM leads WHERE 1=1';
        const params = [];

        if (filter.country) {
          params.push(`%${filter.country}%`);
          query += ` AND country ILIKE $${params.length}`;
        }
        if (filter.search) {
          params.push(`%${filter.search}%`);
          query += ` AND (company_name ILIKE $${params.length} OR director ILIKE $${params.length} OR registration_number ILIKE $${params.length})`;
        }
        if (filter.hasEmail === 'true') {
          query += ` AND email IS NOT NULL AND email != ''`;
        }
        if (filter.hasPhone === 'true') {
          query += ` AND phone IS NOT NULL AND phone != ''`;
        }

        // Sort by Priority: Phone & Email (1st) -> Website (2nd) -> Rest (3rd) -> created_at DESC
        query += ` ORDER BY 
          (CASE 
            WHEN (email IS NOT NULL AND TRIM(email) != '') AND (phone IS NOT NULL AND TRIM(phone) != '') THEN 1
            WHEN (email IS NOT NULL AND TRIM(email) != '') OR (phone IS NOT NULL AND TRIM(phone) != '') THEN 2
            WHEN (website IS NOT NULL AND TRIM(website) != '') THEN 3
            ELSE 4 
          END) ASC,
          created_at DESC`;

        if (filter.limit) {
          params.push(parseInt(filter.limit, 10));
          query += ` LIMIT $${params.length}`;
        }

        const res = await this.pool.query(query, params);
        return res.rows;
      } catch (err) {
        console.warn('[DB] Direct PG leads query failed, trying SDK/local:', err.message);
      }
    }

    // Local Storage Fallback
    try {
      ensureLocalDir();
      const raw = fs.readFileSync(LOCAL_LEADS_FILE, 'utf-8');
      let leads = JSON.parse(raw || '[]');

      if (filter.country) {
        leads = leads.filter(l => l.country && l.country.toLowerCase().includes(filter.country.toLowerCase()));
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        leads = leads.filter(l =>
          (l.company_name && l.company_name.toLowerCase().includes(q)) ||
          (l.director && l.director.toLowerCase().includes(q)) ||
          (l.registration_number && l.registration_number.toLowerCase().includes(q))
        );
      }
      if (filter.hasEmail === 'true') {
        leads = leads.filter(l => l.email && l.email.trim().length > 0);
      }
      if (filter.hasPhone === 'true') {
        leads = leads.filter(l => l.phone && l.phone.trim().length > 0);
      }

      // Priority sort: Phone & Email (1) -> Website (2) -> Rest (3)
      leads.sort((a, b) => {
        const getScore = (l) => {
          const hasEmail = Boolean(l.email && l.email.trim());
          const hasPhone = Boolean(l.phone && l.phone.trim());
          const hasWebsite = Boolean(l.website && l.website.trim());
          if (hasEmail && hasPhone) return 1;
          if (hasEmail || hasPhone) return 2;
          if (hasWebsite) return 3;
          return 4;
        };
        const scoreDiff = getScore(a) - getScore(b);
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      if (filter.limit) {
        leads = leads.slice(0, parseInt(filter.limit, 10));
      }

      return leads;
    } catch {
      return [];
    }
  }

  async findDuplicate(country, registrationNumber, companyName) {
    if (this.pool) {
      try {
        if (registrationNumber && registrationNumber.trim()) {
          const res = await this.pool.query(
            'SELECT id, company_name FROM leads WHERE country = $1 AND registration_number = $2 LIMIT 1',
            [country, registrationNumber.trim()]
          );
          if (res.rows.length > 0) {
            return { isDuplicate: true, existingId: res.rows[0].id, matchField: 'registration_number' };
          }
        }

        if (companyName && companyName.trim()) {
          const res = await this.pool.query(
            'SELECT id, company_name FROM leads WHERE country = $1 AND lower(trim(company_name)) = lower(trim($2)) LIMIT 1',
            [country, companyName.trim()]
          );
          if (res.rows.length > 0) {
            return { isDuplicate: true, existingId: res.rows[0].id, matchField: 'company_name' };
          }
        }

        return { isDuplicate: false };
      } catch (err) {
        console.warn('[DB] PG duplicate check failed, using local fallback:', err.message);
      }
    }

    // Local Storage Check
    ensureLocalDir();
    const leads = JSON.parse(fs.readFileSync(LOCAL_LEADS_FILE, 'utf-8') || '[]');
    const regNorm = (registrationNumber || '').trim().toLowerCase();
    const nameNorm = (companyName || '').trim().toLowerCase();

    for (const lead of leads) {
      if (lead.country === country) {
        if (regNorm && lead.registration_number && lead.registration_number.toLowerCase().trim() === regNorm) {
          return { isDuplicate: true, existingId: lead.id, matchField: 'registration_number' };
        }
        if (nameNorm && lead.company_name && lead.company_name.toLowerCase().trim() === nameNorm) {
          return { isDuplicate: true, existingId: lead.id, matchField: 'company_name' };
        }
      }
    }

    return { isDuplicate: false };
  }

  async insertLead(lead) {
    const record = {
      ...lead,
      id: lead.id || crypto.randomUUID(),
      created_at: lead.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.pool) {
      try {
        const query = `
          INSERT INTO leads (
            id, company_name, registration_number, country, status,
            incorporation_date, company_type, address, city, postal_code,
            director, website, email, phone, industry, source,
            enrichment_status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19
          ) RETURNING *
        `;
        const values = [
          record.id, record.company_name, record.registration_number || '', record.country,
          record.status || 'Active', record.incorporation_date || '', record.company_type || '',
          record.address || '', record.city || '', record.postal_code || '',
          record.director || '', record.website || '', record.email || '',
          record.phone || '', record.industry || '', record.source || 'Registry API',
          record.enrichment_status || 'pending', record.created_at, record.updated_at
        ];

        const res = await this.pool.query(query, values);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn('[DB] PG lead insert failed, persisting to local storage:', err.message);
      }
    }

    // Local Storage Insertion
    ensureLocalDir();
    const leads = JSON.parse(fs.readFileSync(LOCAL_LEADS_FILE, 'utf-8') || '[]');
    leads.unshift(record);
    fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(leads, null, 2));
    return record;
  }

  async updateLead(id, updates) {
    if (this.pool) {
      try {
        const fields = [];
        const values = [];
        let i = 1;

        for (const [key, val] of Object.entries(updates)) {
          fields.push(`${key} = $${i}`);
          values.push(val);
          i++;
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
        const res = await this.pool.query(query, values);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn('[DB] PG lead update failed:', err.message);
      }
    }

    // Local Storage Update
    ensureLocalDir();
    const leads = JSON.parse(fs.readFileSync(LOCAL_LEADS_FILE, 'utf-8') || '[]');
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index] = { ...leads[index], ...updates, updated_at: new Date().toISOString() };
      fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(leads, null, 2));
      return leads[index];
    }
    return null;
  }

  // --- SCRAPE JOBS OPERATIONS ---

  async createJob(jobData) {
    const job = {
      id: jobData.id || crypto.randomUUID(),
      countries: jobData.countries || [],
      status: jobData.status || 'running',
      leads_collected: jobData.leads_collected || 0,
      duplicates_skipped: jobData.duplicates_skipped || 0,
      errors_count: jobData.errors_count || 0,
      started_at: new Date().toISOString(),
      finished_at: null,
      logs: jobData.logs || [],
      summary: null
    };

    if (this.pool) {
      try {
        const query = `
          INSERT INTO scrape_jobs (
            id, countries, status, leads_collected, duplicates_skipped,
            errors_count, started_at, logs
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `;
        const values = [
          job.id, JSON.stringify(job.countries), job.status,
          job.leads_collected, job.duplicates_skipped, job.errors_count,
          job.started_at, JSON.stringify(job.logs)
        ];
        const res = await this.pool.query(query, values);
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn('[DB] PG job create failed:', err.message);
      }
    }

    // Local Storage
    ensureLocalDir();
    const jobs = JSON.parse(fs.readFileSync(LOCAL_JOBS_FILE, 'utf-8') || '[]');
    jobs.unshift(job);
    fs.writeFileSync(LOCAL_JOBS_FILE, JSON.stringify(jobs, null, 2));
    return job;
  }

  async updateJob(id, updates) {
    if (this.pool) {
      try {
        const fields = [];
        const values = [];
        let i = 1;

        if (updates.status !== undefined) {
          fields.push(`status = $${i++}`);
          values.push(updates.status);
        }
        if (updates.leads_collected !== undefined) {
          fields.push(`leads_collected = $${i++}`);
          values.push(updates.leads_collected);
        }
        if (updates.duplicates_skipped !== undefined) {
          fields.push(`duplicates_skipped = $${i++}`);
          values.push(updates.duplicates_skipped);
        }
        if (updates.errors_count !== undefined) {
          fields.push(`errors_count = $${i++}`);
          values.push(updates.errors_count);
        }
        if (updates.finished_at !== undefined) {
          fields.push(`finished_at = $${i++}`);
          values.push(updates.finished_at);
        }
        if (updates.logs !== undefined) {
          fields.push(`logs = $${i++}`);
          values.push(JSON.stringify(updates.logs));
        }
        if (updates.summary !== undefined) {
          fields.push(`summary = $${i++}`);
          values.push(updates.summary);
        }

        if (fields.length > 0) {
          values.push(id);
          const query = `UPDATE scrape_jobs SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
          const res = await this.pool.query(query, values);
          if (res.rows[0]) return res.rows[0];
        }
      } catch (err) {
        console.warn('[DB] PG job update failed:', err.message);
      }
    }

    // Local Storage
    ensureLocalDir();
    const jobs = JSON.parse(fs.readFileSync(LOCAL_JOBS_FILE, 'utf-8') || '[]');
    const index = jobs.findIndex(j => j.id === id);
    if (index !== -1) {
      jobs[index] = { ...jobs[index], ...updates };
      fs.writeFileSync(LOCAL_JOBS_FILE, JSON.stringify(jobs, null, 2));
      return jobs[index];
    }
    return null;
  }

  async getAllJobs(limit = 20) {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM scrape_jobs ORDER BY started_at DESC LIMIT $1',
          [limit]
        );
        return res.rows;
      } catch (err) {
        console.warn('[DB] PG jobs list failed:', err.message);
      }
    }

    // Local Storage
    ensureLocalDir();
    const jobs = JSON.parse(fs.readFileSync(LOCAL_JOBS_FILE, 'utf-8') || '[]');
    return jobs.slice(0, limit);
  }

  async getJobById(id) {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM scrape_jobs WHERE id = $1 LIMIT 1',
          [id]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.warn('[DB] PG job fetch failed:', err.message);
      }
    }

    // Local Storage
    ensureLocalDir();
    const jobs = JSON.parse(fs.readFileSync(LOCAL_JOBS_FILE, 'utf-8') || '[]');
    return jobs.find(j => j.id === id) || null;
  }
}

export const db = new DatabaseService();
