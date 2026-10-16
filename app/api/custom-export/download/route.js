import { NextResponse } from 'next/server';
import { exporter } from '@/lib/services/exporter';

export async function POST(req) {
  try {
    const body = await req.json();
    const { rows, selectedColumns, fileName = 'Filtered_B2B_Newspaper_Leads.xlsx' } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rows provided for export' },
        { status: 400 }
      );
    }

    const safeFileName = (fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`).replace(/[^a-zA-Z0-9_.-]/g, '_');
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
      { success: false, error: error.message || 'Failed to generate Excel download' },
      { status: 500 }
    );
  }
}
