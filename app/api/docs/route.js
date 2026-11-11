// app/api/docs/route.js
// GET /api/docs - Returns OpenAPI 3.0 JSON specification

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'B2B Lead Scraper & Sales Intelligence API',
      version: '2.2.0',
      description: 'REST API for Google Maps hyper-local places scraping, LinkedIn decision-maker leads extraction, Instagram business/creator search, Facebook business pages extraction, multi-format exports (Excel, CSV, JSON), and CRM pipeline management.'
    },
    paths: {
      '/api/scrape': {
        post: {
          summary: 'Trigger a scraping job (Google Maps, LinkedIn, Instagram, or Facebook Leads)',
          description: 'Executes headless queries for local businesses on Google Maps, decision-makers on LinkedIn, businesses/creators on Instagram, or business pages on Facebook, extracts verified phone numbers and addresses, crawls websites for emails, and appends to Master_B2B_Leads.xlsx.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    engine: { type: 'string', enum: ['MAPS', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK'], default: 'MAPS', description: 'Scraping engine to execute' },
                    query: { type: 'string', example: 'site:facebook.com "Miami Beach" bakery -inurl:groups', description: 'Search query or compiled phrase' },
                    category: { type: 'string', example: 'Fitness Coach Gym', description: 'Business category or niche' },
                    bioIntent: { type: 'string', example: 'DM for Collabs', description: 'Target bio keywords or intent' },
                    brand: { type: 'string', example: 'Gymshark', description: 'Target brand or account handle' },
                    role: { type: 'string', example: 'Founder CEO', description: 'LinkedIn/Instagram target role/title' },
                    industry: { type: 'string', example: 'SaaS Software', description: 'Target industry' },
                    location: { type: 'string', example: 'San Francisco', description: 'Target geographic location' },
                    company: { type: 'string', example: 'Stripe', description: 'Optional target company' },
                    limit: { type: 'integer', default: 20, description: 'Number of places/profiles to scrape' },
                    enrich: { type: 'boolean', default: true, description: 'Crawl business websites for contact emails' },
                    delayMs: { type: 'integer', default: 1000 },
                    stream: { type: 'boolean', default: false, description: 'Set true to receive Server-Sent Events (SSE) live logs' },
                    notificationEmail: { type: 'string', description: 'Optional recipient email for scrape summary. If omitted, no email is sent.' },
                    webhookUrl: { type: 'string', description: 'Optional webhook endpoint (Slack, Discord, Zapier, Make) to receive completion events.' }
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
        },
        patch: {
          summary: 'Update lead status or details',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Lead UUID' },
                    status: { type: 'string', enum: ['Active', 'New', 'Contacted', 'Meeting Scheduled', 'Qualified', 'Unqualified', 'Converted'] }
                  },
                  required: ['id']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Lead updated successfully' }
          }
        },
        delete: {
          summary: 'Delete a lead record',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Lead UUID' }
                  },
                  required: ['id']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Lead deleted successfully' }
          }
        }
      },
      '/api/export': {
        get: {
          summary: 'Download Master dataset (Excel, CSV, or JSON)',
          description: 'Streams the master leads dataset in Excel (.xlsx), CSV (.csv), or JSON (.json) format.',
          parameters: [
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['xlsx', 'csv', 'json'], default: 'xlsx' }, description: 'Desired output format' }
          ],
          responses: {
            '200': { description: 'Exported dataset buffer' }
          }
        }
      },
      '/api/custom-export/download': {
        post: {
          summary: 'Download custom filtered records with specific columns',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rows: { type: 'array', items: { type: 'object' } },
                    selectedColumns: { type: 'array', items: { type: 'string' } },
                    fileName: { type: 'string', default: 'Exported_Leads.xlsx' },
                    format: { type: 'string', enum: ['xlsx', 'csv', 'json'], default: 'xlsx' }
                  },
                  required: ['rows']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Export file download' }
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
