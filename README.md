# @otwa/444host-mcp

[![npm version](https://img.shields.io/npm/v/@otwa/444host-mcp.svg?style=flat)](https://www.npmjs.com/package/@otwa/444host-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-blue.svg)](https://modelcontextprotocol.io)

Model Context Protocol server for [444host.com](https://444host.com). Manage
your VPS fleet, web hosting, domains, billing, support tickets and webhooks —
and place real orders — from Claude Code, Claude Desktop, Cursor, VS Code and
other MCP-capable AI tools, just by talking to them.

## Quick start (hosted — recommended)

No install. Point your client at the hosted Streamable-HTTP endpoint with an
API key from [444host.com/account/api-keys](https://444host.com/account/api-keys):

```bash
claude mcp add --transport http 444host https://api.444host.com/mcp \
  --header "Authorization: Bearer h444_…"
```

OAuth-capable clients can connect without pasting a key — approve in the
browser via the RFC 8628 device-code flow (AS metadata at
`api.444host.com/.well-known/oauth-authorization-server`).

## Quick start (local / stdio)

```bash
H444_API_KEY=h444_… npx -y @otwa/444host-mcp
```

Or in a client config:

```json
{
  "mcpServers": {
    "444host": {
      "command": "npx",
      "args": ["-y", "@otwa/444host-mcp"],
      "env": { "H444_API_KEY": "h444_…" }
    }
  }
}
```

Environment:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `H444_API_KEY` | yes | — | Your `h444_…` API key |
| `H444_API_BASE` | no | `https://api.444host.com` | Override for staging |

## Tools

137 tools, each gated by your key's scopes:

- **account** — `h444_get_account`
- **ordering** — list plans at YOUR prices / OS templates; order VPS + hosting (`orders:write`, double-confirm + idempotent)
- **capacity pools** — catalogue / quote / list / get; create and resize (each needs `confirm: true` and has a quoting tool beside it, so the amount you are shown is produced by the code that charges it); the pool's own IP block (list / assign); build free VPS inside a pool; terminate (`vps:destroy`, with a typed-label guard)
- **hosting-panel** — stats, logs, visitor stats, PHP, cron, databases, backups, files (read/write/delete/mkdir/rename), password-protected directories, git deploy (deploy key, deploy, pull, push webhook), WAF and SSH-terminal access (`hosting:manage`, opt-in)
- **add-on domains + apps** — list / add / remove domains on a hosting account, their SFTP+DB credentials and DNS records; one-click apps: catalogue, install, retry, admin login, remove (reads `hosting:read`, changes `hosting:manage`)
- **mail** — list mail domains / mailboxes / aliases (`mail:read`); create/delete mailboxes + aliases, reset mailbox password (`mail:write`)
- **vps** — list / get / stats / IPs+reverse-DNS / all IPs / class block / plan-options; renew now (`billing:write`); power, rename, set/clear PTR, change-plan/resize (`vps:write`); reinstall, terminate (`vps:destroy`, confirm + data-loss acknowledgement)
- **hosting** — list / get; PHP version, SSL re-issue, suspend/unsuspend (`hosting:write`); renew now (`billing:write`); terminate (`hosting:destroy`)
- **domains** — prices, availability check; register / transfer in (`orders:write`) and renew (`billing:write`) — each charges the wallet and needs a double confirm; list / get; update auto-renew / lock / WHOIS / nameservers; DNS records (`domains:write`)
- **billing** — invoices, wallet, transactions, crypto deposit address (`billing:read`); pay an invoice (`billing:write`)
- **tickets** — list / get; open / reply / close (`tickets:write`)
- **webhooks** — event names / list / get / deliveries; create / update / delete / rotate-secret / redeliver (`webhooks:write`)

Destructive operations require the opt-in `vps:destroy` / `hosting:destroy`
scopes; ordering requires the opt-in `orders:write` scope (it spends your
wallet). Orders, reinstalls and ticket-creates carry an automatic
`Idempotency-Key` so a retried LLM call can't act twice.

## Docs

Full API reference, scopes and changelog: **https://444host.com/developers**
