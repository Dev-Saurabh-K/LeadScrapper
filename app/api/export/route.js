// app/api/export/route.js
// GET /api/export?format=xlsx|csv|json - Streams master leads in Excel, CSV, or JSON

import { exporter } from '@/lib/services/exporter.js';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const format = (url.searchParams.get('format') || 'xlsx').toLowerCase();

    if (format === 'csv') {
      const { buffer, fileName } = await exporter.generateMasterCsv();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    if (format === 'json') {
      const { buffer, fileName } = await exporter.generateMasterJson();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    const { buffer, fileName } = await exporter.generateMasterExcel();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
