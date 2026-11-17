import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Host444Client } from '../client/http';
import { mediumConfirm } from '../guards/confirm';
import { jsonResult, safeHandler } from './_helpers';

const idArg = { id: z.string().describe('Hosting account UUID. Retrieve via h444_list_hosting.') };

/** Site control-panel tools (scope `hosting:manage`). Everything the REST API
 *  offers except what an assistant cannot use: binary transfers (file/backup
 *  download, upload) and launching the browser SSH terminal. */
export function registerHostingPanelTools(server: McpServer, client: Host444Client): void {
  server.registerTool(
    'h444_hosting_stats',
    { title: 'Hosting site stats', description: 'Disk/inode/bandwidth/mailbox usage for a hosting account.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/stats`))),
  );

  server.registerTool(
    'h444_hosting_logs',
    { title: 'Tail hosting logs', description: 'Tail the access or error log.', inputSchema: { ...idArg, kind: z.enum(['access', 'error']).optional(), lines: z.number().int().optional() } },
    safeHandler(async ({ id, kind, lines }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/logs?kind=${kind || 'access'}&lines=${lines || 100}`))),
  );

  server.registerTool(
    'h444_hosting_set_php',
    { title: 'Set PHP version', description: 'Switch the account\'s PHP-FPM version. 8.5 is the only version offered.', inputSchema: { ...idArg, phpVersion: z.string().describe('"8.5".') } },
    safeHandler(async ({ id, phpVersion }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/php-version`, { method: 'PATCH', body: { php_version: phpVersion } }))),
  );

  server.registerTool(
    'h444_hosting_get_cron',
    { title: 'Get cron jobs', description: 'Read the crontab.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/cron`))),
  );

  server.registerTool(
    'h444_hosting_set_cron',
    { title: 'Set cron jobs', description: 'Replace the crontab.', inputSchema: { ...idArg, jobs: z.array(z.object({ schedule: z.string(), command: z.string(), comment: z.string().nullable().optional() })), header: z.string().optional() } },
    safeHandler(async ({ id, jobs, header }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/cron`, { method: 'PUT', body: { jobs, header } }))),
  );

  server.registerTool(
    'h444_hosting_list_databases',
    { title: 'List hosting databases', description: 'Extra MySQL databases on the account.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/databases`))),
  );

  server.registerTool(
    'h444_hosting_add_database',
    { title: 'Add a hosting database', description: 'Create an extra MySQL database.', inputSchema: { ...idArg, suffix: z.string().describe('Database name suffix.') } },
    safeHandler(async ({ id, suffix }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/databases`, { method: 'POST', body: { suffix } }))),
  );

  server.registerTool(
    'h444_hosting_remove_database',
    { title: 'Remove a hosting database', description: 'Delete an extra MySQL database. Set confirm:true.', inputSchema: { ...idArg, name: z.string().describe('Database name.'), ...mediumConfirm } },
    safeHandler(async ({ id, name }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/databases/${encodeURIComponent(name)}`, { method: 'DELETE' }))),
  );

  server.registerTool(
    'h444_hosting_list_backups',
    { title: 'List hosting backups', description: 'Site backups (restore points).', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/backups`))),
  );

  server.registerTool(
    'h444_hosting_create_backup',
    { title: 'Create a hosting backup', description: 'Create a new site backup.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/backups`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_hosting_restore_backup',
    { title: 'Restore a hosting backup', description: 'Restore the site from a backup — overwrites current files. Set confirm:true.', inputSchema: { ...idArg, backupId: z.string(), ...mediumConfirm } },
    safeHandler(async ({ id, backupId }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/backups/${encodeURIComponent(backupId)}/restore`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_hosting_delete_backup',
    { title: 'Delete a hosting backup', description: 'Delete a backup. Set confirm:true.', inputSchema: { ...idArg, backupId: z.string(), ...mediumConfirm } },
    safeHandler(async ({ id, backupId }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/backups/${encodeURIComponent(backupId)}`, { method: 'DELETE' }))),
  );

  server.registerTool(
    'h444_hosting_list_files',
    { title: 'List site files', description: 'List a directory in the site (default /public_html).', inputSchema: { ...idArg, path: z.string().optional() } },
    safeHandler(async ({ id, path }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/files?path=${encodeURIComponent(path || '/public_html')}`))),
  );

  server.registerTool(
    'h444_hosting_read_file',
    { title: 'Read a site file', description: 'Read a text file\'s contents.', inputSchema: { ...idArg, path: z.string() } },
    safeHandler(async ({ id, path }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/files/read?path=${encodeURIComponent(path)}`))),
  );

  server.registerTool(
    'h444_hosting_write_file',
    { title: 'Write a site file', description: 'Create or overwrite a text file.', inputSchema: { ...idArg, path: z.string(), content: z.string() } },
    safeHandler(async ({ id, path, content }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/files`, { method: 'PUT', body: { path, content } }))),
  );

  server.registerTool(
    'h444_hosting_delete_file',
    { title: 'Delete a site file/dir', description: 'Delete a file or directory. Set confirm:true.', inputSchema: { ...idArg, path: z.string(), recursive: z.boolean().optional(), ...mediumConfirm } },
    safeHandler(async ({ id, path, recursive }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/files?path=${encodeURIComponent(path)}&recursive=${recursive ? 'true' : 'false'}`, { method: 'DELETE' }))),
  );

  server.registerTool(
    'h444_hosting_make_dir',
    { title: 'Create a directory', description: 'Create a directory in the site.', inputSchema: { ...idArg, path: z.string().describe('e.g. /public_html/assets') } },
    safeHandler(async ({ id, path }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/files/mkdir`, { method: 'POST', body: { path } }))),
  );

  server.registerTool(
    'h444_hosting_rename_file',
    { title: 'Rename or move a file', description: 'Rename or move a file or directory within the site.', inputSchema: { ...idArg, from: z.string(), to: z.string() } },
    safeHandler(async ({ id, from, to }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/files/rename`, { method: 'POST', body: { from, to } }))),
  );

  // ── Password-protected directories ──────────────────────────────────────
  server.registerTool(
    'h444_hosting_list_protected_dirs',
    { title: 'List password-protected directories', description: 'Directories behind HTTP basic auth.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/protected-dirs`))),
  );

  server.registerTool(
    'h444_hosting_protect_dir',
    {
      title: 'Password-protect a directory',
      description: 'Put a directory behind HTTP basic auth (or change its login).',
      inputSchema: { ...idArg, path: z.string().describe('e.g. /public_html/admin'), username: z.string().min(1).max(64), password: z.string().min(8).max(128) },
    },
    safeHandler(async ({ id, path, username, password }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/protected-dirs`, { method: 'POST', body: { path, basic_user: username, password } }))),
  );

  server.registerTool(
    'h444_hosting_unprotect_dir',
    { title: 'Remove a directory\'s password', description: 'Make the directory public again. Set confirm:true.', inputSchema: { ...idArg, path: z.string(), ...mediumConfirm } },
    safeHandler(async ({ id, path }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/protected-dirs?path=${encodeURIComponent(path)}`, { method: 'DELETE' }))),
  );

  // ── WAF + SSH access (operator-approved features) ───────────────────────
  server.registerTool(
    'h444_hosting_waf_status',
    { title: 'Web application firewall status', description: 'The firewall mode (Off, DetectionOnly or On) and how many audit-log lines it has recorded. Needs WAF access to be granted first (h444_hosting_waf_access).', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/waf`))),
  );

  server.registerTool(
    'h444_hosting_waf_access',
    { title: 'WAF access status', description: 'Whether this account has access to the WAF panel, or a request is pending.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/waf/access`))),
  );

  server.registerTool(
    'h444_hosting_request_waf_access',
    { title: 'Request WAF access', description: 'Ask 444host to enable the WAF panel for this account. Reviewed by staff.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/waf/access`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_hosting_ssh_access',
    { title: 'SSH terminal access status', description: 'Whether the browser SSH terminal is enabled for this account, or a request is pending. The terminal itself opens in the dashboard.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/ssh-terminal/access`))),
  );

  server.registerTool(
    'h444_hosting_request_ssh_access',
    { title: 'Request SSH terminal access', description: 'Ask 444host to enable the browser SSH terminal for this account. Reviewed by staff.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/ssh-terminal/access`, { method: 'POST' }))),
  );

  // ── Git deploy ──────────────────────────────────────────────────────────
  server.registerTool(
    'h444_hosting_git_status',
    { title: 'Git deploy status', description: 'The connected repository, branch, subdirectory and last deploy result, if any.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git`))),
  );

  server.registerTool(
    'h444_hosting_git_deploy_key',
    { title: 'Get the git deploy key', description: 'The SSH public key to add as a read-only deploy key on the repository (needed for private repos).', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git/deploy-key`))),
  );

  server.registerTool(
    'h444_hosting_git_deploy',
    {
      title: 'Connect a repository and deploy',
      description:
        'Clones `repoUrl` at `branch` into the site (optionally only `subdir`) and connects it for later pulls. Overwrites ' +
        'files at the target — confirm with the user. For a private repo add the deploy key first.',
      inputSchema: { ...idArg, repoUrl: z.string().min(1), branch: z.string().min(1).max(255), subdir: z.string().max(255).optional(), ...mediumConfirm },
    },
    safeHandler(async ({ id, repoUrl, branch, subdir }) =>
      jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git/deploy`, { method: 'POST', body: { repo_url: repoUrl, branch, subdir } }))),
  );

  server.registerTool(
    'h444_hosting_git_pull',
    { title: 'Pull the latest commit', description: 'Pull the connected branch and redeploy.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git/pull`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_hosting_git_webhook',
    { title: 'Get the push webhook', description: 'The URL to add as a push webhook on the repository so every push deploys automatically, if enabled.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git/webhook`))),
  );

  server.registerTool(
    'h444_hosting_enable_git_webhook',
    { title: 'Enable deploy-on-push', description: 'Create the push webhook URL (returned) for automatic deploys.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git/webhook`, { method: 'POST' }))),
  );

  server.registerTool(
    'h444_hosting_disable_git_webhook',
    { title: 'Disable deploy-on-push', description: 'Revoke the push webhook URL.', inputSchema: idArg },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git/webhook`, { method: 'DELETE' }))),
  );

  server.registerTool(
    'h444_hosting_git_disconnect',
    { title: 'Disconnect the repository', description: 'Stop tracking the repository. The deployed files stay. Set confirm:true.', inputSchema: { ...idArg, ...mediumConfirm } },
    safeHandler(async ({ id }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/git`, { method: 'DELETE' }))),
  );

  // ── Visitors ────────────────────────────────────────────────────────────
  server.registerTool(
    'h444_hosting_visitor_stats',
    { title: 'Visitor statistics', description: 'From the access log: hits, unique IPs and bytes; status-code counts; a time series; top paths, referrers, IPs and countries.', inputSchema: { ...idArg, period: z.enum(['24h', '7d', '30d']).optional().describe('Default 7d.') } },
    safeHandler(async ({ id, period }) => jsonResult(await client.request(`/v1/hosting/${encodeURIComponent(id)}/visitor-stats?period=${period || '7d'}`))),
  );
}
