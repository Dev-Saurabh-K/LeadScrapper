// app/api/leads/route.js
// GET /api/leads - Returns leads with search, filter, and pagination

import { db } from '@/lib/database.js';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || '';
    const search = searchParams.get('search') || '';
    const hasEmail = searchParams.get('hasEmail') || '';
    const hasPhone = searchParams.get('hasPhone') || '';
    const limit = searchParams.get('limit') || '100';

    const leads = await db.getAllLeads({
      country,
      search,
      hasEmail,
      hasPhone,
      limit
    });

    return Response.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
