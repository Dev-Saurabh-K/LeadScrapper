import { NextResponse } from 'next/server';
import { excelParser } from '@/lib/services/excel-parser';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId') || '';

  try {
    const { data, job } = await excelParser.loadLeadsDataset({ jobId });
    return NextResponse.json({
      success: true,
      data,
      job
    });
  } catch (error) {
    console.error('[API /api/custom-export/master] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load master leads' },
      { status: 500 }
    );
  }
}
