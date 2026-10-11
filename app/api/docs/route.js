// app/api/docs/route.js
// GET /api/docs - Returns OpenAPI 3.0 JSON specification


export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'B2B Lead Scraper API',
      version: '1.0.0',
      description: 'REST API for international public registry scraping, lead normalization, website enrichment, and Excel exports.'
    },
    paths: {
      '/api/scrape': {
        post: {
          summary: 'Trigger a scraping job',
          description: 'Executes connectors across specified countries, deduplicates leads, optionally enriches website contacts, updates Master_B2B_Leads.xlsx, and sends email summaries.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    countries: { type: 'array', items: { type: 'string' }, example: ['NO', 'FR', 'SG', 'US'] },
                    query: { type: 'string', example: 'software' },
                    limit: { type: 'integer', default: 20 },
                    enrich: { type: 'boolean', default: false },
                    delayMs: { type: 'integer', default: 1000 },
                    stream: { type: 'boolean', default: false, description: 'Set true to receive Server-Sent Events (SSE) live logs' }
                  },
                  required: ['countries']
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
      },
      '/api/health': {
        get: {
          summary: 'System health, connectors, and diagnostics',
          responses: { '200': { description: 'Health check result' } }
        }
      }
    }
  };

  return Response.json(spec);
}
