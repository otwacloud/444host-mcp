import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { mediumConfirm } from '../guards/confirm';
import { jsonResult, safeHandler } from './_helpers';

export function registerBillingTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_list_invoices',
    {
      title: 'List invoices',
      description: 'Paginated invoice list.',
      inputSchema: {
        page: z.number().int().min(1).optional().describe('Page number (default 1).'),
        limit: z.number().int().min(1).max(100).optional().describe('Page size (default 50).'),
      },
    },
    safeHandler(async ({ page, limit }) =>
      jsonResult(await client.request('/v1/billing/invoices', { query: { page, limit } }))),
  );

  server.registerTool(
    'h444_get_invoice',
    { title: 'Get an invoice', description: 'A single invoice with line items.', inputSchema: { id: z.string().describe('Invoice id.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/billing/invoices/${encodeURIComponent(id)}`))),
  );

  server.registerTool(
    'h444_get_wallet',
    { title: 'Get wallet balance', description: 'Prepaid wallet balance and state.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/billing/wallet'))),
  );

  server.registerTool(
    'h444_list_wallet_transactions',
    {
      title: 'List wallet transactions',
      description: 'Recent wallet transactions.',
      inputSchema: { limit: z.number().int().min(1).max(100).optional().describe('How many (default 20).') },
    },
    safeHandler(async ({ limit }) =>
      jsonResult(await client.request('/v1/billing/wallet/transactions', { query: { limit } }))),
  );

  server.registerTool(
    'h444_pay_invoice',
    {
      title: 'Pay an invoice from wallet balance',
      description: 'Settle an unpaid invoice from the wallet balance (fails if insufficient — top up in the dashboard first). Spends money, so set confirm:true. Requires the opt-in billing:write scope.',
      inputSchema: { id: z.string().describe('Invoice id. Retrieve via h444_list_invoices.'), ...mediumConfirm },
    },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/billing/invoices/${encodeURIComponent(id)}/pay`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_get_deposit_address',
    {
      title: 'Get a crypto deposit address',
      description: 'The account\'s USDT deposit address on TRON (default) or Arbitrum, created on first use. Deposits credit the wallet after network confirmation.',
      inputSchema: { chain: z.enum(['tron', 'arbitrum']).optional() },
    },
    safeHandler(async ({ chain }) =>
      jsonResult(await client.request('/v1/billing/wallet/deposit-address', { method: 'POST', body: { chain: chain ?? 'tron' } }))),
  );
}
