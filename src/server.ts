import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Host444Client } from './client/http';
import { registerAllTools } from './tools/_register';
import { packageInfo } from './util/version';
import type { Host444Env } from './util/env';

/** Build a fresh McpServer wired to a Host444Client scoped to one API key.
 *  The HTTP transport calls this per-request (stateless); stdio calls it once. */
export function createServer(env: Host444Env): McpServer {
  const pkg = packageInfo();
  const server = new McpServer({ name: pkg.name, version: pkg.version });
  const client = new Host444Client({ apiKey: env.apiKey, apiBase: env.apiBase });
  registerAllTools(server, client);
  return server;
}
