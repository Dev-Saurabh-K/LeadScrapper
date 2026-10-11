// scripts/migrate-supabase.mjs
// Applies the PostgreSQL schema to the Supabase database automatically

import pg from 'pg';
import fs from 'fs';
import path from 'path';
// Read .env manually
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      val = val.replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
} catch {
  // ignore
}

const { Client } = pg;
const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not configured in .env');
  process.exit(1);
}

console.log('Connecting to Supabase PostgreSQL at:', dbUrl.split('@')[1] || 'database...');

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL successfully!');

    console.log('Running schema migration from supabase/schema.sql...');
    await client.query(schemaSql);
    console.log('✅ Schema migration executed successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('leads', 'scrape_jobs');
    `);

    console.log('Public tables found:');
    res.rows.forEach(r => console.log(`  - public.${r.table_name}`));

    console.log('\n🎉 Supabase database is now fully provisioned and ready for live leads!');
  } catch (err) {
    console.error('❌ Database migration error:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
