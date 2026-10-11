// app/api/notify/route.js
// POST /api/notify - Sends customized or job summary leads report emails via Nodemailer SMTP

import { notifier } from '@/lib/services/notifier.js';
import { exporter } from '@/lib/services/exporter.js';
import { db } from '@/lib/database.js';
import { config } from '@/lib/config.js';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const recipient = body.recipient || config.smtp.recipient;
    const subject = body.subject || '';
    const customNote = body.customNote || '';
    const country = body.country || '';
    const attachExcel = body.attachExcel !== false;

    // Fetch leads from DB for accurate metrics and filtering
    const leads = await db.getAllLeads(country ? { country } : {});
    const countries = Array.from(new Set(leads.map(l => l.country).filter(Boolean)));

    // Generate Excel attachment if requested
    let excelAttachment = null;
    if (attachExcel) {
      try {
        const { buffer } = await exporter.generateMasterExcel(leads);
        excelAttachment = buffer;
      } catch (err) {
        console.warn('[Notify API] Excel generation warning:', err.message);
      }
    }

    const emailResult = await notifier.sendCustomEmail({
      recipient,
      subject,
      customNote,
      totalLeads: leads.length,
      countries,
      excelAttachment
    });

    return Response.json({
      success: emailResult.sent,
      configured: config.smtp.isConfigured,
      result: emailResult,
      leadsCount: leads.length
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
