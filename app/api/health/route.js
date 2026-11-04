// app/api/health/route.js
// GET /api/health - System diagnostic status for database, SMTP, and Google Maps scraper engine

import { db } from '@/lib/database.js';
import { config } from '@/lib/config.js';
import { CONNECTORS } from '@/lib/connectors/index.js';

export async function GET() {
  try {
    const dbStatus = await db.checkStatus();
    const leads = await db.getAllLeads();
    const jobs = await db.getAllJobs();

    const connectorsList = Object.values(CONNECTORS).map(c => ({
      code: c.code,
      name: c.name,
      flag: c.flag,
      source: c.source,
      requiresAuth: false,
      isReady: true
    }));

    return Response.json({
      status: 'healthy',
      engine: 'Google Maps (Hyper-Local Scraper)',
      database: dbStatus,
      email: {
        isConfigured: config.smtp.isConfigured,
        host: config.smtp.host,
        recipient: config.smtp.recipient,
        user: config.smtp.user ? `${config.smtp.user.slice(0, 3)}***` : 'None'
      },
      connectors: connectorsList,
      stats: {
        totalLeads: leads.length,
        totalJobs: jobs.length,
        countriesCount: new Set(leads.map(l => l.country).filter(Boolean)).size,
        enrichedCount: leads.filter(l => l.email || l.phone).length
      }
    });
  } catch (err) {
    return Response.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
