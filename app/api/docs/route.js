// app/api/docs/route.js
// GET /api/docs - Returns OpenAPI 3.0 JSON specification

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Google Maps B2B Lead Scraper API',
      version: '2.0.0',
      description: 'REST API for live Google Maps hyper-local places scraping, verified contact normalization, website email crawling, and Excel exports.'
    },
    paths: {
      '/api/scrape': {
        post: {
          summary: 'Trigger a Google Maps scraping job',
          description: 'Executes headless stealth browser queries on Google Maps for local businesses, extracts verified phone numbers and addresses, crawls company websites for emails, and appends to Master_B2B_Leads.xlsx.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', example: 'school in Manhattan, New York, United States', description: 'Location and niche search query' },
                    limit: { type: 'integer', default: 20, description: 'Number of places to scrape' },
                    enrich: { type: 'boolean', default: true, description: 'Crawl business websites for contact emails' },
                    delayMs: { type: 'integer', default: 1000 },
                    stream: { type: 'boolean', default: false, description: 'Set true to receive Server-Sent Events (SSE) live logs' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Scrape completed or stream opened' }
          }
        }
      },
      '/api/leads': {
        get: {
          summary: 'Search and filter stored leads',
          parameters: [
            { name: 'country', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'hasEmail', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'hasPhone', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }
          ],
          responses: {
            '200': { description: 'List of lead records' }
          }
        }
      },
      '/api/export': {
        get: {
          summary: 'Download Master_B2B_Leads.xlsx',
          description: 'Streams the styled Excel workbook containing all leads.',
          responses: {
            '200': {
              description: 'Binary Excel file',
              content: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {}
              }
            }
          }
        }
      },
      '/api/jobs': {
        get: {
          summary: 'List recent scrape jobs and stats',
          responses: {
            '200': { description: 'Job list' }
          }
        }
      },
      '/api/enrich': {
        post: {
          summary: 'Enrich a lead from their company website',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { id: { type: 'string' } },
                  required: ['id']
                }
              }
            }
          },
          responses: { '200': { description: 'Enriched lead' } }
        }
      },
      '/api/notify': {
        post: {
          summary: 'Send job summary email via SMTP',
          responses: { '200': { description: 'Notification status' } }
        }
      }
    }
  };

  return Response.json(spec);
}
