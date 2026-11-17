export interface Host444Env {
  apiKey: string;
  apiBase: string;
}

const KEYS_URL = 'https://444host.com/account/api-keys';

/** Read + validate the env for the stdio transport. The hosted HTTP transport
 *  reads the key per-request instead (see src/http/index.ts). */
export function readEnv(): Host444Env {
  const apiKey = process.env.H444_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new Error(
      `H444_API_KEY is not set. Create one at ${KEYS_URL} and set the H444_API_KEY ` +
        'environment variable, then restart this MCP server.',
    );
  }
  if (!apiKey.startsWith('h444_')) {
    throw new Error(
      `H444_API_KEY does not look like a 444host.com API key (expected prefix "h444_"). ` +
        `Generate a new key at ${KEYS_URL}.`,
    );
  }
  // The public API is served directly at https://api.444host.com/v1/* (the edge
  // rewrites /v1 → the in-app /api/v1). So the base is the host; tools call /v1/*.
  const apiBase = (process.env.H444_API_BASE?.trim() || 'https://api.444host.com').replace(/\/+$/, '');
  return { apiKey, apiBase };
}
