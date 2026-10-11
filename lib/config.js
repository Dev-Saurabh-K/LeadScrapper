import fs from 'fs';
import path from 'path';

// If running in standalone node process without Next.js runtime, auto-load .env
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const envFile = path.join(process.cwd(), '.env');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          let v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      });
    }
  } catch {
    // ignore
  }
}

export const config = {
  // Supabase (PostgreSQL)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
    get isConfigured() {
      return Boolean(this.url && (this.serviceRoleKey || this.anonKey));
    }
  },

  // Registry API Keys
  registries: {
    companiesHouseApiKey: process.env.COMPANIES_HOUSE_API_KEY || '',
    abnLookupGuid: process.env.ABN_LOOKUP_GUID || '',
    get hasUKKey() {
      return Boolean(this.companiesHouseApiKey && this.companiesHouseApiKey.trim().length > 0);
    },
    get hasAustraliaGuid() {
      return Boolean(this.abnLookupGuid && this.abnLookupGuid.trim().length > 0);
    }
  },

  // SMTP Email Settings
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'B2B Lead Scraper <noreply@leadscrape.com>',
    recipient: process.env.NOTIFICATION_EMAIL_TO || process.env.SMTP_USER || '',
    get isConfigured() {
      return Boolean(this.host && this.user && this.pass);
    }
  },

  // Scraper Politeness & Rate Limits
  scraper: {
    userAgent: process.env.SCRAPER_USER_AGENT || 'B2BLeadScraper/1.0 (+https://github.com/the-corent/leadscrape; sales@leadscrape.com)',
    defaultDelayMs: parseInt(process.env.SCRAPER_DEFAULT_DELAY_MS || '1000', 10),
    maxRetries: 3,
    requestTimeoutMs: 15000
  },

  // Export Settings
  exports: {
    outputDir: 'exports',
    fileName: 'Master_B2B_Leads.xlsx'
  }
};
