import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Host444Client } from '../client/http';
import { jsonResult, safeHandler } from './_helpers';

export function registerAccountTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_get_account',
    {
      title: 'Get account profile',
      description: 'Returns the authenticated 444host.com account profile (id, email, name, country, verification, created date).',
      inputSchema: {},
    },
    safeHandler(async () => jsonResult(await client.request('/v1/account'))),
  );
}
