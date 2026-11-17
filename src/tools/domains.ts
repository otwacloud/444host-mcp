import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { jsonResult, safeHandler } from './_helpers';

const idArg = { id: z.string().describe('Domain UUID. Retrieve via h444_list_domains.') };

export function registerDomainTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_list_domains',
    { title: 'List domains', description: 'Every registered domain on the account.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/domains'))),
  );

  server.registerTool(
    'h444_get_domain',
    { title: 'Get a domain', description: 'Detail for one domain (status, expiry, nameservers, lock/privacy/auto-renew).', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}`))),
  );

  server.registerTool(
    'h444_update_domain',
    {
      title: 'Update domain settings',
      description: 'Update auto-renew, transfer lock, WHOIS privacy, and/or nameservers. Only the provided fields change.',
      inputSchema: {
        ...idArg,
        auto_renew: z.boolean().optional().describe('Enable/disable auto-renew.'),
        transfer_lock: z.boolean().optional().describe('Enable/disable the registrar transfer lock.'),
        whois_privacy: z.boolean().optional().describe('Enable/disable WHOIS privacy.'),
        nameservers: z.array(z.string()).max(6).optional().describe('Up to 6 nameservers (replaces the set).'),
      },
    },
    safeHandler(async ({ id, ...body }) =>
      jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}`, { method: 'PATCH', body }))),
  );

  server.registerTool(
    'h444_get_domain_contact',
    { title: 'Get registrant (WHOIS) contact', description: 'The registrant contact used for new registrations (returns defaults if none saved).', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/domains/contact'))),
  );

  server.registerTool(
    'h444_set_domain_contact',
    {
      title: 'Set registrant (WHOIS) contact',
      description: 'Create or update the registrant contact used for new domain registrations.',
      inputSchema: {
        first_name: z.string(), last_name: z.string(), email: z.string(), phone: z.string(),
        address1: z.string(), city: z.string(), postal_code: z.string(), country: z.string().describe('ISO-2, e.g. TR.'),
        org: z.string().optional(), address2: z.string().optional(), state: z.string().optional(),
      },
    },
    safeHandler(async (body) => jsonResult(await client.request('/v1/domains/contact', { method: 'PUT', body }))),
  );

  server.registerTool(
    'h444_request_domain_auth_code',
    { title: 'Request EPP auth code', description: 'Email the EPP transfer (auth) code to the registrant. Domain must be active with the transfer lock off.', inputSchema: { id: z.string().describe('Domain id.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/auth-code`, { method: 'POST' }))),
  );
}
