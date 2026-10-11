// app/api/jobs/[id]/route.js
// GET /api/jobs/[id] - Get details and logs of a specific scrape job

import { db } from '@/lib/database.js';


export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const job = await db.getJobById(id);

    if (!job) {
      return Response.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      job
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
