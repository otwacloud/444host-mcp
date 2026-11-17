import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { jsonResult, safeHandler } from './_helpers';

/** Ordering tools — these SPEND the wallet (opt-in `orders:write` scope on the
 *  key is the real gate). Both carry an explicit double-confirm: the model
 *  must show the user the plan + the price it fetched before calling. */

const spendConfirm = {
  confirm: z.literal(true).describe(
    'Must be exactly `true`. Confirms the user saw the plan and the exact price (from h444_list_products) and approved the purchase.',
  ),
  iAcknowledgeWalletCharge: z.literal(true).describe(
    'Must be exactly `true`. The order immediately debits the account wallet at the listed your_monthly_usd_cents price.',
  ),
};

export function registerOrderTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_list_products',
    { title: 'List plans & your prices', description: 'Orderable VPS and hosting plans with retail and YOUR effective price (reseller discount applied). Always show the user your_monthly_usd_cents before ordering.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/products'))),
  );

  server.registerTool(
    'h444_list_os_templates',
    { title: 'List OS templates', description: 'Installable OS templates for VPS orders and reinstalls.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/os-templates'))),
  );

  server.registerTool(
    'h444_order_vps',
    {
      title: 'Order a VPS (SPENDS WALLET)',
      description: 'Places a real VPS order: debits the wallet at your effective price, provisions, and returns the server + its initial root password (summarise — do not paste the password into chat). Provisioning failure auto-refunds.',
      inputSchema: {
        plan_slug: z.string().describe('Plan slug from h444_list_products (category vps).'),
        label: z.string().describe('Display label, e.g. web-1.'),
        hostname: z.string().describe('DNS-safe hostname.'),
        os_family: z.string().describe('OS family from h444_list_os_templates, e.g. ubuntu.'),
        os_template: z.string().describe('OS template id, e.g. ubuntu-22.04.'),
        ...spendConfirm,
      },
    },
    safeHandler(async ({ plan_slug, label, hostname, os_family, os_template }) =>
      jsonResult(await client.request('/v1/vps', {
        method: 'POST',
        body: { plan_slug, label, hostname, os_family, os_template },
        idempotent: true,
        timeoutMs: 180_000,
      }))),
  );

  server.registerTool(
    'h444_order_hosting',
    {
      title: 'Order web hosting (SPENDS WALLET)',
      description: 'Places a real hosting order: debits the wallet at your effective price and provisions. Returns the account + SFTP/DB passwords (summarise — do not paste them into chat). Provisioning failure auto-refunds.',
      inputSchema: {
        plan_slug: z.string().describe('Plan slug from h444_list_products (category hosting).'),
        domain: z.string().describe('FQDN the account will serve, e.g. example.com.'),
        username: z.string().describe('Lowercase a-z0-9_ username, 3-32 chars, starts with a letter.'),
        php_version: z.enum(['7.4', '8.1', '8.3']).optional().describe('Defaults to 8.3.'),
        ...spendConfirm,
      },
    },
    safeHandler(async ({ plan_slug, domain, username, php_version }) =>
      jsonResult(await client.request('/v1/hosting', {
        method: 'POST',
        body: { plan_slug, domain, username, php_version },
        idempotent: true,
        timeoutMs: 180_000,
      }))),
  );
}
