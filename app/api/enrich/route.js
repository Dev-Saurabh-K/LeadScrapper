// app/api/enrich/route.js
// POST /api/enrich - Triggers website contact enrichment on a lead

import { db } from '@/lib/database.js';
import { enrichment } from '@/lib/services/enrichment.js';


export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return Response.json({ success: false, error: 'Lead id is required' }, { status: 400 });
    }

    const leads = await db.getAllLeads();
    const lead = leads.find(l => l.id === id);

    if (!lead) {
      return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.website) {
      return Response.json({
        success: false,
        error: 'Lead has no website registered. Cannot perform enrichment.'
      }, { status: 400 });
    }

    const result = await enrichment.enrichLead(lead);
    const updates = {
      enrichment_status: result.status
    };
    if (result.email) updates.email = result.email;
    if (result.phone) updates.phone = result.phone;

    const updatedLead = await db.updateLead(id, updates);

    return Response.json({
      success: true,
      lead: updatedLead,
      enrichment: result
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
