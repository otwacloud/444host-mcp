import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { mediumConfirm } from '../guards/confirm';
import { jsonResult, safeHandler } from './_helpers';
import { dnsRecordInput } from './hosting-sites';

/** Wallet-charging guard: same double flag as the order tools. */
const spendConfirm = {
  confirm: z.literal(true).describe('Must be exactly `true`. The user saw the exact price and approved the purchase.'),
  iAcknowledgeWalletCharge: z.literal(true).describe('Must be exactly `true`. This immediately debits the account wallet.'),
};


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
        nameservers: z.array(z.string()).min(2).max(13).optional().describe('2–13 nameservers (replaces the set).'),
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

  // ── Prices, availability, ordering ──────────────────────────────────────
  server.registerTool(
    'h444_list_tld_pricing',
    { title: 'List domain prices', description: 'Every TLD we sell with register / renew / transfer price per year (USD cents) and the allowed period.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/domains/pricing'))),
  );

  server.registerTool(
    'h444_check_domain',
    {
      title: 'Check if a domain is available',
      description:
        'Live availability + price for one full domain. `available: null` means the registry gave no clear answer; ' +
        '`sellable: false` means we do not sell that TLD. Limited to 40 checks a minute — do not loop over many names.',
      inputSchema: { domain: z.string().min(4).max(253).describe('Full domain, e.g. example.com') },
    },
    safeHandler(async ({ domain }) => jsonResult(await client.request(`/v1/domains/check?domain=${encodeURIComponent(domain)}`))),
  );

  server.registerTool(
    'h444_register_domain',
    {
      title: 'Register a domain (charges the wallet)',
      description:
        'Registers a domain for `years` and debits the wallet at once. Before calling: (1) h444_check_domain for ' +
        'availability and price, (2) make sure a registrant contact is saved (h444_get_domain_contact), (3) show the ' +
        'user the total (price × years) and get approval. Omit nameservers to use ours (a DNS zone is created). ' +
        'Registration runs right after payment; if the registry refuses, the wallet is refunded. Scope `orders:write`.',
      inputSchema: {
        domain: z.string().min(4).max(253),
        years: z.number().int().min(1).max(10).optional().describe('Default 1.'),
        nameservers: z.array(z.string()).min(2).max(13).optional(),
        ...spendConfirm,
      },
    },
    safeHandler(async ({ domain, years, nameservers }) =>
      jsonResult(await client.request('/v1/domains', { method: 'POST', body: { domain, years, nameservers }, idempotent: true }))),
  );

  server.registerTool(
    'h444_transfer_domain',
    {
      title: 'Transfer a domain in (charges the wallet)',
      description:
        'Starts a transfer from another registrar with its auth (EPP) code and debits the transfer price. The domain ' +
        'must be unlocked at the current registrar. It shows `transfer_pending` until the registry completes the move ' +
        '(usually up to 5 days). Scope `orders:write`.',
      inputSchema: {
        domain: z.string().min(4).max(253),
        authCode: z.string().min(6).max(64).describe('Auth / EPP code from the current registrar.'),
        nameservers: z.array(z.string()).min(2).max(13).optional(),
        ...spendConfirm,
      },
    },
    safeHandler(async ({ domain, authCode, nameservers }) =>
      jsonResult(await client.request('/v1/domains/transfer', {
        method: 'POST', body: { domain, auth_code: authCode, nameservers }, idempotent: true,
      }))),
  );

  server.registerTool(
    'h444_renew_domain',
    {
      title: 'Renew a domain (charges the wallet)',
      description: 'Adds `years` at the renew price (see h444_list_tld_pricing), paid from the wallet. Show the total first. Scope `billing:write`.',
      inputSchema: { ...idArg, years: z.number().int().min(1).max(10).optional().describe('Default 1.'), ...spendConfirm },
    },
    safeHandler(async ({ id, years }) =>
      jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/renew`, { method: 'POST', body: { years }, idempotent: true }))),
  );

  // ── DNS records ─────────────────────────────────────────────────────────
  server.registerTool(
    'h444_list_domain_dns',
    {
      title: 'List a domain\'s DNS records',
      description: 'Records in the domain\'s zone on our nameservers. Each record\'s `id` changes when the record changes — pass the current one to update or delete.',
      inputSchema: idArg,
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/dns`))),
  );

  server.registerTool(
    'h444_add_domain_dns',
    { title: 'Add a DNS record', description: 'Adds one record to the domain\'s zone.', inputSchema: { ...idArg, ...dnsRecordInput } },
    safeHandler(async ({ id, ...body }) =>
      jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/dns`, { method: 'POST', body }))),
  );

  server.registerTool(
    'h444_update_domain_dns',
    {
      title: 'Update a DNS record',
      description: 'Replaces one record. Refused if it changed since it was read — list again and retry.',
      inputSchema: { ...idArg, recordId: z.string().describe('Record id from h444_list_domain_dns.'), ...dnsRecordInput },
    },
    safeHandler(async ({ id, recordId, ...body }) =>
      jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/dns/${encodeURIComponent(recordId)}`, { method: 'PATCH', body }))),
  );

  server.registerTool(
    'h444_delete_domain_dns',
    {
      title: 'Delete a DNS record',
      description: 'Deletes one record. A deleted A or MX record can take a site or mail offline — confirm first.',
      inputSchema: { ...idArg, recordId: z.string(), ...mediumConfirm },
    },
    safeHandler(async ({ id, recordId }) =>
      jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/dns/${encodeURIComponent(recordId)}`, { method: 'DELETE' }))),
  );

  server.registerTool(
    'h444_request_domain_auth_code',
    { title: 'Request EPP auth code', description: 'Email the EPP transfer (auth) code to the registrant. Domain must be active with the transfer lock off.', inputSchema: { id: z.string().describe('Domain id.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/domains/${encodeURIComponent(id)}/auth-code`, { method: 'POST' }))),
  );
}
