// app/api/jobs/route.js
// GET /api/jobs - List scrape job history

import { db } from '@/lib/database.js';


export async function GET() {
  try {
    const jobs = await db.getAllJobs(30);
    return Response.json({
      success: true,
      jobs
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
