import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { mediumConfirm } from '../guards/confirm';
import { jsonResult, safeHandler } from './_helpers';

const domainIdArg = { domainId: z.number().int().describe('Mail domain id. Retrieve via h444_list_mail_domains.') };

/** Email-hosting tools — parity with the mail panel. Mail domains follow hosting
 *  accounts (read-only); mailboxes + aliases are full CRUD. Reads carry
 *  mail:read, mutations carry mail:write. */
export function registerMailTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_list_mail_domains',
    { title: 'List mail domains', description: 'Every mail domain on the account (they follow your hosting accounts).', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/mail/domains'))),
  );

  server.registerTool(
    'h444_list_domain_mailboxes',
    { title: 'List a mail domain\'s mailboxes', description: 'Mailboxes under one mail domain.', inputSchema: domainIdArg },
    safeHandler(async ({ domainId }) => jsonResult(await client.request(`/v1/mail/domains/${domainId}/mailboxes`))),
  );

  server.registerTool(
    'h444_list_domain_aliases',
    { title: 'List a mail domain\'s aliases', description: 'Forwarding aliases under one mail domain.', inputSchema: domainIdArg },
    safeHandler(async ({ domainId }) => jsonResult(await client.request(`/v1/mail/domains/${domainId}/aliases`))),
  );

  server.registerTool(
    'h444_list_mailboxes',
    { title: 'List all mailboxes', description: 'Every mailbox across all your mail domains.', inputSchema: {} },
    safeHandler(async () => jsonResult(await client.request('/v1/mail/mailboxes'))),
  );

  server.registerTool(
    'h444_create_mailbox',
    {
      title: 'Create a mailbox',
      description: 'Create a mailbox on a mail domain.',
      inputSchema: {
        ...domainIdArg,
        localPart: z.string().describe('The part before @ (e.g. "info").'),
        password: z.string().describe('Mailbox password.'),
        quotaMb: z.number().int().optional().describe('Mailbox quota in MB (optional).'),
      },
    },
    safeHandler(async ({ domainId, localPart, password, quotaMb }) =>
      jsonResult(await client.request('/v1/mail/mailboxes', { method: 'POST', body: { domain_id: domainId, local_part: localPart, password, quota_mb: quotaMb } }))),
  );

  server.registerTool(
    'h444_reset_mailbox_password',
    { title: 'Reset a mailbox password', description: 'Set a new password for a mailbox.', inputSchema: { id: z.number().int().describe('Mailbox id.'), password: z.string().describe('New password.') } },
    safeHandler(async ({ id, password }) => jsonResult(await client.request(`/v1/mail/mailboxes/${id}/password`, { method: 'PATCH', body: { password } }))),
  );

  server.registerTool(
    'h444_delete_mailbox',
    { title: 'Delete a mailbox', description: 'Permanently delete a mailbox and its mail. Set confirm:true.', inputSchema: { id: z.number().int().describe('Mailbox id.'), ...mediumConfirm } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/mail/mailboxes/${id}`, { method: 'DELETE' }))),
  );

  server.registerTool(
    'h444_create_alias',
    {
      title: 'Create a forwarding alias',
      description: 'Create a forwarding alias (source → destination).',
      inputSchema: {
        ...domainIdArg,
        sourceLocal: z.string().describe('Alias source local-part (e.g. "sales").'),
        destination: z.string().describe('Destination email address.'),
      },
    },
    safeHandler(async ({ domainId, sourceLocal, destination }) =>
      jsonResult(await client.request('/v1/mail/aliases', { method: 'POST', body: { domain_id: domainId, source_local: sourceLocal, destination } }))),
  );

  server.registerTool(
    'h444_delete_alias',
    { title: 'Delete a forwarding alias', description: 'Remove a forwarding alias.', inputSchema: { id: z.number().int().describe('Alias id.') } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/mail/aliases/${id}`, { method: 'DELETE' }))),
  );
}
