#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';
import { readEnv } from './util/env';
import { packageInfo } from './util/version';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--version') || argv.includes('-v')) {
    const pkg = packageInfo();
    process.stdout.write(`${pkg.name} ${pkg.version}\n`);
    return;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  let env;
  try {
    env = readEnv();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[444host-mcp] ${msg}\n`);
    process.exit(1);
  }

  const server = createServer(env);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async (signal: string): Promise<void> => {
    try { await server.close(); } catch { /* best-effort */ }
    process.stderr.write(`[444host-mcp] shutdown on ${signal}\n`);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

function printHelp(): void {
  const pkg = packageInfo();
  process.stdout.write(
    `${pkg.name} ${pkg.version}\n\n` +
      'Model Context Protocol server for 444host.com.\n\n' +
      'Usage:\n' +
      '  444host-mcp            Start the stdio MCP server (spawned by Claude Code, Cursor, etc.)\n' +
      '  444host-mcp --version  Print version and exit\n' +
      '  444host-mcp --help     Show this help\n\n' +
      'Environment:\n' +
      '  H444_API_KEY   Required. Generate at https://444host.com/account/api-keys\n' +
      '  H444_API_BASE  Optional. Default https://api.444host.com\n\n' +
      'Docs: https://444host.com/developers\n',
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  process.stderr.write(`[444host-mcp] fatal: ${msg}\n`);
  process.exit(1);
});
