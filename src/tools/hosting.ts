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


const idArg = { id: z.string().describe('Hosting account UUID. Retrieve via h444_list_hosting.') };

export function registerHostingTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_list_hosting',
    { title: 'List hosting accounts', description: 'Every web-hosting account: status, quota, usage, connection hosts. Passwords are never returned on the API.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/hosting'))),
  );

  server.registerTool(
    'h444_get_hosting',
    { title: 'Get a hosting account', description: 'Detail for one hosting account.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}`))),
  );

  server.registerTool(
    'h444_set_hosting_php',
    {
      title: 'Set hosting PHP version',
      description: 'Switch the account\'s PHP-FPM version (7.4 / 8.1 / 8.3). Briefly restarts the PHP pool — set confirm:true.',
      inputSchema: { ...idArg, php_version: z.enum(['7.4', '8.1', '8.3']), ...mediumConfirm },
    },
    safeHandler(async ({ id, php_version }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/php`, { method: 'PUT', body: { php_version } }))),
  );

  server.registerTool(
    'h444_retry_hosting_ssl',
    { title: 'Re-issue hosting SSL', description: 'Retry the Let\'s Encrypt certificate issue for the account\'s domain now (e.g. after pointing DNS).', inputSchema: idArg },
    safeHandler(async ({ id }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/ssl/retry`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_renew_hosting',
    {
      title: 'Renew a hosting account now (charges the wallet)',
      description: 'Pays the next term now from the wallet. Result `status`: paid, insufficient (nothing charged) or already. Scope `billing:write`.',
      inputSchema: { id: z.string().describe('Hosting account UUID.'), ...spendConfirm },
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/renew`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_suspend_hosting',
    {
      title: 'Suspend hosting',
      description: 'Suspend the account — site and databases stop serving. Reversible. Set confirm:true.',
      inputSchema: { ...idArg, ...mediumConfirm },
    },
    safeHandler(async ({ id }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/suspend`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_unsuspend_hosting',
    { title: 'Unsuspend hosting', description: 'Lift a suspension and restore service.', inputSchema: idArg },
    safeHandler(async ({ id }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/unsuspend`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_terminate_hosting',
    {
      title: 'Terminate hosting (DESTRUCTIVE)',
      description: 'Permanently removes the site, databases, and mail; the username becomes reusable. Requires the hosting:destroy scope. Call h444_get_hosting first and confirm the domain with the user.',
      inputSchema: {
        ...idArg,
        expectedDomain: z.string().describe('The account\'s current domain, as a typo-guard.'),
        ...destructiveConfirm,
      },
    },
    safeHandler(async ({ id, expectedDomain }) => {
      const detail = await client.request<{ domain?: string }>(`/v1/hosting/${encodeURIComponent(id)}`);
      const actual = detail?.domain || '';
      if (expectedDomain && actual && expectedDomain.trim().toLowerCase() !== actual.trim().toLowerCase()) {
        return { isError: true, content: [{ type: 'text', text: `Refusing to terminate: expectedDomain "${expectedDomain}" does not match the account's domain "${actual}".` }] };
      }
      return jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}`, { method: 'DELETE' }));
    }),
  );
}
