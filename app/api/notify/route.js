// app/api/notify/route.js
// POST /api/notify - Sends a manual or test job summary email via SMTP

import { notifier } from '@/lib/services/notifier.js';
import { exporter } from '@/lib/services/exporter.js';
import { config } from '@/lib/config.js';


export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const jobStats = body.jobStats || {
      leadsCollected: body.leadsCollected ?? 25,
      duplicatesSkipped: body.duplicatesSkipped ?? 3,
      errorsCount: body.errorsCount ?? 0
    };
    const countries = body.countries || ['Norway', 'Singapore', 'France'];

    // Generate current excel to attach
    let excelAttachment = null;
    try {
      const { buffer } = await exporter.generateMasterExcel();
      excelAttachment = buffer;
    } catch {
      // non-blocking
    }

    const emailResult = await notifier.sendJobSummary(jobStats, countries, excelAttachment);

    return Response.json({
      success: emailResult.sent,
      configured: config.smtp.isConfigured,
      result: emailResult
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
