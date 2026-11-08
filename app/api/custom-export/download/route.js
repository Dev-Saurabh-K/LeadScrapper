import { NextResponse } from 'next/server';
import { exporter } from '@/lib/services/exporter';

export async function POST(req) {
  try {
    const body = await req.json();
    const { rows, selectedColumns, fileName = 'Filtered_B2B_Leads.xlsx', format = 'xlsx' } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rows provided for export' },
        { status: 400 }
      );
    }

    const fmt = String(format).toLowerCase();
    const baseName = fileName.replace(/\.(xlsx|csv|json)$/i, '').replace(/[^a-zA-Z0-9_.-]/g, '_');

    if (fmt === 'csv') {
      const safeFileName = `${baseName}.csv`;
      const buffer = await exporter.generateCustomCsv({
        rows,
        selectedColumns: Array.isArray(selectedColumns) && selectedColumns.length > 0 ? selectedColumns : undefined
      });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFileName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    if (fmt === 'json') {
      const safeFileName = `${baseName}.json`;
      const buffer = await exporter.generateCustomJson({
        rows,
        selectedColumns: Array.isArray(selectedColumns) && selectedColumns.length > 0 ? selectedColumns : undefined
      });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFileName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    const safeFileName = `${baseName}.xlsx`;
    const buffer = await exporter.generateCustomExcel({
      rows,
      selectedColumns: Array.isArray(selectedColumns) && selectedColumns.length > 0 ? selectedColumns : undefined,
      fileName: safeFileName
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[API /api/custom-export/download] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate export download' },
      { status: 500 }
    );
  }
}
