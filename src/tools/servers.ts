import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { destructiveConfirm, mediumConfirm } from '../guards/confirm';
import { jsonResult, safeHandler } from './_helpers';

/** Wallet-charging guard: same double flag as the order tools. */
const spendConfirm = {
  confirm: z.literal(true).describe('Must be exactly `true`. The user saw the exact price and approved the purchase.'),
  iAcknowledgeWalletCharge: z.literal(true).describe('Must be exactly `true`. This immediately debits the account wallet.'),
};


const idArg = { id: z.string().describe('VPS UUID. Retrieve via h444_list_vps.') };

export function registerServerTools(server: McpServer, client: Host444Client): void {
  // ── Reads ──────────────────────────────────────────────────────────────
  server.registerTool(
    'h444_list_vps',
    { title: 'List VPS', description: 'Every VPS on the account (id, label, status, IP, plan specs). Use the id with per-server tools.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/vps'))),
  );

  server.registerTool(
    'h444_get_vps',
    { title: 'Get a VPS', description: 'Full detail for one VPS. Always call this before any destructive op so the user can confirm against the current label.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}`))),
  );

  server.registerTool(
    'h444_get_vps_stats',
    { title: 'Live VPS stats', description: 'Latest CPU / memory / network / disk usage for a VPS.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/stats`))),
  );

  server.registerTool(
    'h444_list_vps_ips',
    { title: 'List VPS IPs & reverse DNS', description: 'Every IP on a VPS with its current PTR (reverse DNS) record. zoneHosted:false means the PTR cannot be managed here.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/ips`))),
  );

  server.registerTool(
    'h444_list_all_vps_ips',
    { title: 'List every IP on every server', description: 'All IPv4 addresses across the account\'s servers, with the server each belongs to and its reverse DNS.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/vps/all-ips'))),
  );

  server.registerTool(
    'h444_get_vps_class_block',
    { title: 'Get a server\'s /24 class block', description: 'The /24 IP class block attached to a server (from the ip-class add-on), if any.', inputSchema: { id: z.string().describe('VPS UUID.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/class-block`))),
  );

  server.registerTool(
    'h444_renew_vps',
    {
      title: 'Renew a server now (charges the wallet)',
      description:
        'Pays the next term now from the wallet. Result `status`: paid (term advanced; a suspended server comes back), ' +
        'insufficient (nothing charged; `shortfall_usd_cents` to top up) or already (next term already paid). Scope `billing:write`.',
      inputSchema: { id: z.string().describe('VPS UUID.'), ...spendConfirm },
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/renew`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_list_vps_plan_options',
    { title: 'List VPS plan options (resize targets)', description: 'Plans a VPS can resize to — same family, same disk size. Returns current plan + options (cheapest first). Pass an option id to h444_change_vps_plan. Empty options = no same-disk plans to move to (Cloud Router S/M/L today).', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/plan-options`))),
  );

  // ── Writes (vps:write) ───────────────────────────────────────────────────
  server.registerTool(
    'h444_power_vps',
    {
      title: 'Power action on a VPS',
      description: 'Start, stop, or reboot a VPS. stop/reboot interrupt the workload — set confirm:true.',
      inputSchema: {
        ...idArg,
        action: z.enum(['start', 'stop', 'reboot']).describe('Power action.'),
        ...mediumConfirm,
      },
    },
    safeHandler(async ({ id, action }) =>
      jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/power/${action}`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_change_vps_plan',
    {
      title: 'Change VPS plan (resize vCPU/RAM)',
      description: 'Switch a VPS to another plan in the same family with the same disk size — an in-place vCPU/RAM resize. The VPS REBOOTS (~1 min); disk never changes. Only the recurring price changes (no proration up, no credit down). Call h444_list_vps_plan_options first for valid productIds, and confirm with the user (it reboots).',
      inputSchema: {
        ...idArg,
        productId: z.string().describe('Target plan id — an option id from h444_list_vps_plan_options.'),
        ...mediumConfirm,
      },
    },
    safeHandler(async ({ id, productId }) =>
      jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/change-plan`, { method: 'POST', body: { productId } }))),
  );

  server.registerTool(
    'h444_rename_vps',
    {
      title: 'Rename a VPS',
      description: 'Change the display label.',
      inputSchema: { ...idArg, label: z.string().describe('New label.') },
    },
    safeHandler(async ({ id, label }) =>
      jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/label`, { method: 'PATCH', body: { label } }))),
  );

  server.registerTool(
    'h444_set_vps_ptr',
    {
      title: 'Set reverse DNS (PTR)',
      description: 'Point an IP\'s PTR record at a hostname (e.g. mail.example.com). Affects mail deliverability — set confirm:true after telling the user the IP and hostname.',
      inputSchema: {
        ...idArg,
        ip: z.string().describe('IP address on the VPS (from h444_list_vps_ips).'),
        hostname: z.string().describe('Hostname the IP should resolve to, e.g. mail.example.com.'),
        ...mediumConfirm,
      },
    },
    safeHandler(async ({ id, ip, hostname }) =>
      jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/ips/${encodeURIComponent(ip)}/ptr`, {
        method: 'PUT', body: { hostname },
      }))),
  );

  server.registerTool(
    'h444_delete_vps_ptr',
    {
      title: 'Clear reverse DNS (PTR)',
      description: 'Remove the PTR record for an IP. Affects mail deliverability — set confirm:true.',
      inputSchema: {
        ...idArg,
        ip: z.string().describe('IP address on the VPS (from h444_list_vps_ips).'),
        ...mediumConfirm,
      },
    },
    safeHandler(async ({ id, ip }) =>
      jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/ips/${encodeURIComponent(ip)}/ptr`, { method: 'DELETE' }))),
  );

  // ── Destructive (vps:destroy) ────────────────────────────────────────────
  server.registerTool(
    'h444_reinstall_vps',
    {
      title: 'Reinstall a VPS (DESTRUCTIVE)',
      description: 'Wipe the disk and rebuild from an OS template (see h444_list_os_templates). Destroys all data. Requires the vps:destroy scope. Idempotent.',
      inputSchema: {
        ...idArg,
        os: z.string().describe('OS family, e.g. ubuntu.'),
        osTemplate: z.string().describe('OS template id to install.'),
        ...destructiveConfirm,
      },
    },
    safeHandler(async ({ id, os, osTemplate }) =>
      jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/reinstall`, {
        method: 'POST', idempotent: true, body: { os, osTemplate },
      }))),
  );

  server.registerTool(
    'h444_terminate_vps',
    {
      title: 'Terminate a VPS (DESTRUCTIVE)',
      description: 'Permanently terminate a VPS. Irreversible. Requires the vps:destroy scope. Call h444_get_vps first and confirm the label with the user.',
      inputSchema: {
        ...idArg,
        expectedLabel: z.string().describe('The current VPS label, as a typo-guard. Must match the server being terminated.'),
        ...destructiveConfirm,
      },
    },
    safeHandler(async ({ id, expectedLabel }) => {
      const detail = await client.request<{ label?: string; hostname?: string }>(`/v1/vps/${encodeURIComponent(id)}`);
      const actual = detail?.label || detail?.hostname || '';
      if (expectedLabel && actual && expectedLabel.trim() !== actual.trim()) {
        return { isError: true, content: [{ type: 'text', text: `Refusing to terminate: expectedLabel "${expectedLabel}" does not match the VPS's current label "${actual}".` }] };
      }
      return jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}`, { method: 'DELETE' }));
    }),
  );

  server.registerTool(
    'h444_vps_sso',
    { title: 'Console SSO for a VPS', description: 'Returns a short-lived URL to the browser VM console for this server.', inputSchema: { id: z.string().describe('VPS UUID.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/sso`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_reset_vps_password',
    { title: 'Reset VPS root password', description: 'Rotate the server root/admin password; the new password is returned once (SENSITIVE — summarise, don\'t paste). Set confirm:true.', inputSchema: { id: z.string().describe('VPS UUID.'), ...mediumConfirm } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/password-reset`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_list_vps_addons',
    { title: 'List VPS add-ons', description: 'Add-ons available/attached for this server — SEO IP Pack (7 IPs from distinct /24 subnets), extra IPs, backups. Prices in cents: monthly_usd_cents recurs, prorated_usd_cents is what a purchase costs today. Only ONE add-on per type may be active, so an entry with owned:true blocks the other tiers of that type until it is removed.', inputSchema: { id: z.string().describe('VPS UUID.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/addons`))),
  );

  server.registerTool(
    'h444_purchase_vps_addon',
    { title: 'Purchase a VPS add-on', description: 'Buy an add-on for the server — DEBITS your wallet balance immediately, prorated to the end of the current cycle, and the add-on then renews with the server EVERY MONTH. Requires the opt-in orders:write scope. Only one add-on per type can be active: to change tier (8 IPs to 16 IPs) call h444_remove_vps_addon first. Set confirm:true.', inputSchema: { id: z.string().describe('VPS UUID.'), addonId: z.string().describe('Add-on id from h444_list_vps_addons, e.g. "seoip7pk" for the SEO IP Pack.'), ...mediumConfirm } },
    safeHandler(async ({ id, addonId }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/addons`, { method: 'POST', body: { addonId } }))),
  );

  server.registerTool(
    'h444_remove_vps_addon',
    { title: 'Remove a VPS add-on', description: 'Cancel an add-on. NO REFUND is issued for the remainder of the current cycle — the recurring price drops from the NEXT renewal onward. For IP add-ons this is immediate and disruptive: the addresses are released and stop routing to the server, so anything bound to them (websites, SSL, mail) breaks — tell the user to unconfigure them in the guest OS first. Uses vps:write, not orders:write, because it spends nothing. Set confirm:true.', inputSchema: { id: z.string().describe('VPS UUID.'), addonId: z.string().describe('Add-on id currently attached, from h444_list_vps_addons.'), ...mediumConfirm } },
    safeHandler(async ({ id, addonId }) => jsonResult(await client.request(`/v1/vps/${encodeURIComponent(id)}/addons/${encodeURIComponent(addonId)}`, { method: 'DELETE' }))),
  );
}
