// app/api/export/route.js
// GET /api/export - Streams Master_B2B_Leads.xlsx for instant download

import { exporter } from '@/lib/services/exporter.js';


export async function GET() {
  try {
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
