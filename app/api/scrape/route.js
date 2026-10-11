// app/api/scrape/route.js
// POST /api/scrape - Starts a scraping job with optional real-time Server-Sent Events (SSE) streaming

import { collector } from '@/lib/services/collector.js';
import { ScrapeRequestSchema } from '@/lib/models.js';


export async function POST(request) {
  try {
    const body = await request.json();
    const validated = ScrapeRequestSchema.parse(body);

    const isStreaming = request.headers.get('accept') === 'text/event-stream' || body.stream === true;

    if (isStreaming) {
      // Set up Server-Sent Events (SSE) response stream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          const sendEvent = (event, data) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            sendEvent('status', { message: 'Scraping job initialized...' });

            const result = await collector.runJob(validated, (logEntry) => {
              sendEvent('log', logEntry);
            });

            sendEvent('complete', result);
            controller.close();
          } catch (err) {
            sendEvent('error', { message: err.message });
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive'
        }
      });
    }

    // Standard JSON response
    const result = await collector.runJob(validated);
    return Response.json({ success: true, result });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
