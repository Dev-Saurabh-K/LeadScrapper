// app/api/leads/route.js
// GET, PATCH, and DELETE endpoints for leads management

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

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ success: false, error: 'Lead id is required' }, { status: 400 });
    }

    const updated = await db.updateLead(id, updates);
    if (!updated) {
      return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      lead: updated
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ success: false, error: 'Lead id is required' }, { status: 400 });
    }

    await db.deleteLead(id);
    return Response.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
