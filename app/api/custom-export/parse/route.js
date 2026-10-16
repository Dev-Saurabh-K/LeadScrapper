import { NextResponse } from 'next/server';
import { excelParser } from '@/lib/services/excel-parser';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await excelParser.parseBuffer(buffer, file.name || 'Uploaded_Leads.xlsx');

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[API /api/custom-export/parse] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse uploaded Excel file' },
      { status: 500 }
    );
  }
}
