-- ==============================================================================
-- B2B Lead Scraper - Database Schema (PostgreSQL / Supabase)
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Create LEADS table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    registration_number TEXT,
    country TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    incorporation_date TEXT,
    company_type TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    director TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    industry TEXT,
    source TEXT NOT NULL,
    enrichment_status TEXT DEFAULT 'pending', -- 'pending', 'enriched', 'failed', 'not_found'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create SCRAPE_JOBS table (history & monitoring)
CREATE TABLE IF NOT EXISTS public.scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    countries JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    leads_collected INTEGER DEFAULT 0,
    duplicates_skipped INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    logs JSONB DEFAULT '[]'::jsonb,
    summary TEXT
);

-- 3. Create Indexes for fast querying & de-duplication
CREATE INDEX IF NOT EXISTS idx_leads_country_reg 
    ON public.leads(country, registration_number);

CREATE INDEX IF NOT EXISTS idx_leads_country_name 
    ON public.leads(country, lower(trim(company_name)));

CREATE INDEX IF NOT EXISTS idx_leads_created_at 
    ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_started_at 
    ON public.scrape_jobs(started_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies allowing read & write operations
CREATE POLICY "Allow public read access to leads" 
    ON public.leads FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert to leads" 
    ON public.leads FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update to leads" 
    ON public.leads FOR UPDATE 
    USING (true);

CREATE POLICY "Allow public read access to jobs" 
    ON public.scrape_jobs FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert to jobs" 
    ON public.scrape_jobs FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update to jobs" 
    ON public.scrape_jobs FOR UPDATE 
    USING (true);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
