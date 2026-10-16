import { NextResponse } from 'next/server';
import { excelParser } from '@/lib/services/excel-parser';

export async function GET() {
  try {
    const data = await excelParser.loadMasterScrapedFile();
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[API /api/custom-export/master] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load master leads' },
      { status: 500 }
    );
  }
}
