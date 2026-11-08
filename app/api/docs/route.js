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
          summary: 'Trigger a scraping job (Google Maps or LinkedIn Leads)',
          description: 'Executes headless queries for local businesses on Google Maps or decision-makers/professionals on LinkedIn (Authless), extracts verified phone numbers and addresses, crawls websites for emails, and appends to Master_B2B_Leads.xlsx.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    engine: { type: 'string', enum: ['MAPS', 'LINKEDIN'], default: 'MAPS', description: 'Scraping engine to execute' },
                    query: { type: 'string', example: 'site:linkedin.com/in Founder SaaS San Francisco', description: 'Search query or compiled phrase' },
                    role: { type: 'string', example: 'Founder CEO', description: 'LinkedIn target role/title' },
                    industry: { type: 'string', example: 'SaaS Software', description: 'LinkedIn target industry' },
                    location: { type: 'string', example: 'San Francisco', description: 'Target geographic location' },
                    company: { type: 'string', example: 'Stripe', description: 'Optional target company' },
                    limit: { type: 'integer', default: 20, description: 'Number of places/profiles to scrape' },
                    enrich: { type: 'boolean', default: true, description: 'Crawl business websites for contact emails' },
                    delayMs: { type: 'integer', default: 1000 },
                    stream: { type: 'boolean', default: false, description: 'Set true to receive Server-Sent Events (SSE) live logs' },
                    notificationEmail: { type: 'string', description: 'Optional recipient email for scrape summary. If omitted, no email is sent.' }
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
