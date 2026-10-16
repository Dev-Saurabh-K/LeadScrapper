import { NextResponse } from 'next/server';
import { notifier } from '@/lib/services/notifier.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      rows,
      selectedColumns,
      fileName = 'B2B_Exported_Leads.xlsx',
      recipient,
      subject,
      customNote = '',
      attachExcel = true
    } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rows provided to email' },
        { status: 400 }
      );
    }

    if (!Array.isArray(selectedColumns) || selectedColumns.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one column for the table' },
        { status: 400 }
      );
    }

    const emailResult = await notifier.sendCustomTableEmail({
      recipient,
      subject,
      customNote,
      rows,
      selectedColumns,
      fileName,
      attachExcel
    });

    if (!emailResult.sent) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || emailResult.reason || 'Failed to send custom table email'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      recipient: emailResult.recipient,
      leadsCount: emailResult.leadsCount,
      columnsCount: emailResult.columnsCount
    });
  } catch (error) {
    console.error('[API /api/custom-export/email] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error while sending email' },
      { status: 500 }
    );
  }
}
