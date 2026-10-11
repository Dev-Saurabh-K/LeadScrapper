// app/api/health/route.js
// GET /api/health - System diagnostic status for database, SMTP, and connectors

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
      requiresAuth: c.requiresAuth,
      isReady: !c.requiresAuth || (c.code === 'UK' && config.registries.hasUKKey) || (c.code === 'AU' && config.registries.hasAustraliaGuid)
    }));

    return Response.json({
      status: 'healthy',
      database: dbStatus,
      email: {
        isConfigured: config.smtp.isConfigured,
        host: config.smtp.host,
        recipient: config.smtp.recipient,
        user: config.smtp.user ? `${config.smtp.user.slice(0, 3)}***` : 'None'
      },
      registries: {
        hasUKKey: config.registries.hasUKKey,
        hasAustraliaGuid: config.registries.hasAustraliaGuid,
        connectors: connectorsList
      },
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
