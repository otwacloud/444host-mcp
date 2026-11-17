import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { destructiveConfirm, mediumConfirm } from '../guards/confirm';
import { jsonResult, safeHandler } from './_helpers';

const enc = encodeURIComponent;
const hostingId = z.string().describe('Hosting account UUID. Retrieve via h444_list_hosting.');
const domainId = z.string().describe('Add-on domain id. Retrieve via h444_list_hosting_domains.');
const appId = z.string().describe('Installed app id. Retrieve via h444_list_hosting_apps.');

/** The DNS record shape the API takes, for both registered-domain and
 *  hosting-domain zones. Exported so the domain tools use the same one. */
export const dnsRecordInput = {
  host: z.string().max(253).optional().describe('Name relative to the zone; "@" (or omitted) = the apex, e.g. "www".'),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA']),
  value: z.string().min(1).max(4096).describe('Record value, e.g. an IP for A, a hostname for CNAME/MX, the text for TXT.'),
  ttl: z.number().int().min(60).max(604800).optional().describe('Seconds, default 3600.'),
  priority: z.number().int().min(0).max(65535).optional().describe('MX and SRV only.'),
  weight: z.number().int().min(0).max(65535).optional().describe('SRV only.'),
  port: z.number().int().min(0).max(65535).optional().describe('SRV only.'),
  flags: z.number().int().optional().describe('CAA only.'),
  tag: z.string().max(16).optional().describe('CAA only: issue, issuewild or iodef.'),
};

/** Hosting add-on domains, their DNS zones and one-click apps.
 *  Reads need `hosting:read`, changes `hosting:manage`. */
export function registerHostingSiteTools(server: McpServer, client: Host444Client): void {
  // ── Add-on domains ──────────────────────────────────────────────────────
  server.registerTool(
    'h444_list_hosting_domains',
    {
      title: 'List domains on a hosting account',
      description:
        'Every domain on the hosting account (the primary one included) with its document root, certificate ' +
        'status, SFTP user and database name. Passwords are not included — use h444_get_hosting_domain_credentials.',
      inputSchema: { id: hostingId },
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains`))),
  );

  server.registerTool(
    'h444_add_hosting_domain',
    {
      title: 'Add a domain to a hosting account',
      description:
        'Adds a domain with its own document root, SFTP user, database and HTTPS certificate. The certificate ' +
        'issues once the domain points at our nameservers (or its A record at the server).',
      inputSchema: { id: hostingId, domain: z.string().min(3).max(253).describe('e.g. shop.example.com') },
    },
    safeHandler(async ({ id, domain }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains`, { method: 'POST', body: { domain } }))),
  );

  server.registerTool(
    'h444_get_hosting_domain_credentials',
    {
      title: 'Get SFTP + database login for an add-on domain',
      description: 'Returns the SFTP and database username and password for one add-on domain. Do not paste the passwords into the chat unless the user asks.',
      inputSchema: { id: hostingId, domainId },
    },
    safeHandler(async ({ id, domainId: d }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains/${enc(d)}/credentials`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_remove_hosting_domain',
    {
      title: 'Remove a domain from a hosting account',
      description:
        'DESTRUCTIVE — removes the add-on domain together with its document root (website files) and its database. ' +
        'Read the domain back to the user and get explicit approval first.',
      inputSchema: { id: hostingId, domainId, ...destructiveConfirm },
    },
    safeHandler(async ({ id, domainId: d }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains/${enc(d)}`, { method: 'DELETE' }))),
  );

  // ── Hosting-domain DNS ──────────────────────────────────────────────────
  server.registerTool(
    'h444_list_hosting_dns',
    {
      title: 'List DNS records of a hosting domain',
      description:
        'Records in the domain\'s zone on our nameservers. Each record has an `id` that changes when the record ' +
        'changes — pass the current one to update or delete.',
      inputSchema: { id: hostingId, domainId },
    },
    safeHandler(async ({ id, domainId: d }) => jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains/${enc(d)}/dns`))),
  );

  server.registerTool(
    'h444_add_hosting_dns',
    { title: 'Add a DNS record to a hosting domain', description: 'Adds one record to the zone.', inputSchema: { id: hostingId, domainId, ...dnsRecordInput } },
    safeHandler(async ({ id, domainId: d, ...body }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains/${enc(d)}/dns`, { method: 'POST', body }))),
  );

  server.registerTool(
    'h444_update_hosting_dns',
    {
      title: 'Update a DNS record of a hosting domain',
      description: 'Replaces one record. Refused if the record changed since it was read — list again and retry.',
      inputSchema: { id: hostingId, domainId, recordId: z.string().describe('Record id from h444_list_hosting_dns.'), ...dnsRecordInput },
    },
    safeHandler(async ({ id, domainId: d, recordId, ...body }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains/${enc(d)}/dns/${enc(recordId)}`, { method: 'PATCH', body }))),
  );

  server.registerTool(
    'h444_delete_hosting_dns',
    {
      title: 'Delete a DNS record of a hosting domain',
      description: 'Deletes one record. A deleted A or MX record can take a site or mail offline — confirm first.',
      inputSchema: { id: hostingId, domainId, recordId: z.string(), ...mediumConfirm },
    },
    safeHandler(async ({ id, domainId: d, recordId }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/domains/${enc(d)}/dns/${enc(recordId)}`, { method: 'DELETE' }))),
  );

  // ── One-click apps ──────────────────────────────────────────────────────
  server.registerTool(
    'h444_list_app_catalogue',
    {
      title: 'List installable one-click apps',
      description: 'Apps that can be installed (WordPress, WooCommerce, Joomla, Drupal, Laravel, Nextcloud, Matomo, phpMyAdmin…) with the `slug` to pass to h444_install_hosting_app.',
      inputSchema: { id: hostingId },
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${enc(id)}/apps/catalogue`))),
  );

  server.registerTool(
    'h444_list_hosting_apps',
    {
      title: 'List installed apps',
      description: 'Apps on the hosting account with status (pending, installing, running, failed, deleting), URL and admin URL.',
      inputSchema: { id: hostingId },
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${enc(id)}/apps`))),
  );

  server.registerTool(
    'h444_install_hosting_app',
    {
      title: 'Install a one-click app',
      description:
        'Installs an app on a subdomain ("@" = the domain root) with its own database, HTTPS and admin login. Returns ' +
        'at once with status "pending" — check h444_list_hosting_apps until "running" (or "failed", then h444_retry_hosting_app). ' +
        'Installing at "@" over an existing site can conflict with its files; ask the user first.',
      inputSchema: {
        id: hostingId,
        appSlug: z.string().min(1).max(32).describe('From h444_list_app_catalogue, e.g. "wordpress".'),
        subdomain: z.string().regex(/^(@|[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)$/).describe('"@" for the root, or a label like "blog".'),
        adminEmail: z.string().email().optional(),
      },
    },
    safeHandler(async ({ id, appSlug, subdomain, adminEmail }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/apps`, {
        method: 'POST',
        body: { app_slug: appSlug, subdomain, admin_email: adminEmail },
      }))),
  );

  server.registerTool(
    'h444_retry_hosting_app',
    { title: 'Retry a failed app install', description: 'Runs a failed install again.', inputSchema: { id: hostingId, appId } },
    safeHandler(async ({ id, appId: a }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/apps/${enc(a)}/retry`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_get_hosting_app_credentials',
    {
      title: 'Get an app\'s admin login',
      description: 'The installed app\'s admin username and password. Do not paste the password into the chat unless the user asks.',
      inputSchema: { id: hostingId, appId },
    },
    safeHandler(async ({ id, appId: a }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/apps/${enc(a)}/credentials`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_remove_hosting_app',
    {
      title: 'Remove an installed app',
      description: 'DESTRUCTIVE — deletes the app\'s files and its database. Get explicit approval first.',
      inputSchema: { id: hostingId, appId, ...destructiveConfirm },
    },
    safeHandler(async ({ id, appId: a }) =>
      jsonResult(await client.request(`/v1/hosting/${enc(id)}/apps/${enc(a)}`, { method: 'DELETE' }))),
  );
}
