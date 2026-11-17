# Changelog

## 1.8.1

- No change to the tools. Released from GitHub Actions through npm Trusted Publishing, with dependencies installed from a committed lockfile and every build tool pinned to an exact version. This is also the first 444host-mcp release with an npm provenance attestation (1.8.0 was published from a workstation).

## 1.8.0

- **Capacity pools** — 11 tools: `h444_list_pool_products`, `h444_quote_pool`,
  `h444_list_pools`, `h444_get_pool`, `h444_create_pool`, `h444_quote_pool_resize`,
  `h444_resize_pool`, `h444_list_pool_ips`, `h444_assign_pool_ips`,
  `h444_create_pool_server`, `h444_terminate_pool`. Buy a block of
  vCPU/RAM/disk/IPs once and fill it with as many VPS as you like, each billed at
  $0.00.
- Both money paths (`create`, `resize`) require `confirm: true` and each has a
  quoting tool beside it, so the figure you are shown is produced by the code that
  takes the money. Terminate additionally requires `expectedLabel` to match.
- ⚑ `h444_create_pool_server` takes a plan **slug**, not an id — the earlier
  schema said "Plan id" and led callers into a 500.
- Tool count is now 89.

## 1.7.0

- **SEO IP Pack** (`seoip7pk`) is now sellable through `h444_purchase_vps_addon` — 7 dedicated IPs, each from a separate /24 subnet.
- `h444_list_vps_addons` returns 444host pricing in cents (`monthly_usd_cents`, `prorated_usd_cents`) instead of the upstream dollar fields, plus `owned` / `available` / `featured` / `ip_count`.
- `h444_purchase_vps_addon` now bills the customer: prorated wallet debit today, and the add-on renews with the server every month. Auto-refunds if it cannot be attached. Tool count stays 77.

## 1.6.0

- Domain tools: `h444_get_domain_contact` / `h444_set_domain_contact` (registrant/WHOIS) and `h444_request_domain_auth_code` (EPP transfer code). Tool count is now 77.

## 1.5.0

- Server extras: `h444_vps_sso` (console SSO), `h444_reset_vps_password` (confirm), `h444_list_vps_addons`, `h444_purchase_vps_addon` (orders:write, confirm). Tool count is now 74.

## 1.4.0

- `h444_pay_invoice` (`billing:write`, opt-in, medium-confirm) — settle an unpaid invoice from wallet balance. Tool count is now 70.

## 1.3.0

- Hosting control-panel tools (scope `hosting:manage`, opt-in): site stats,
  log tail, PHP version, cron get/set, databases (list/add/remove), backups
  (list/create/restore/delete), and the file manager (list/read/write/delete).
  Destructive ops are medium-confirm gated. Streaming file/backup download,
  upload, the browser-SSH terminal, and git deploy are on the REST API only.
  Tool count is now 69.

## 1.2.0

- Email-hosting tools (mail-panel parity): `h444_list_mail_domains`,
  `h444_list_domain_mailboxes`/`h444_list_domain_aliases`,
  `h444_list_mailboxes`/`h444_create_mailbox`/`h444_reset_mailbox_password`/
  `h444_delete_mailbox`, `h444_create_alias`/`h444_delete_alias`. Reads carry
  `mail:read`, mutations `mail:write`; mailbox delete is medium-confirm gated.
  Tool count is now 53.

## 1.1.0

- VPS resize tools: `h444_list_vps_plan_options` (`vps:read`) lists the plans a
  server can switch to (same family, same disk); `h444_change_vps_plan`
  (`vps:write`, medium-confirm) moves it to one — an in-place vCPU/RAM resize
  that reboots the server (~1 min) and never changes disk. Only the recurring
  price changes (no proration up, no credit down). Powers the new Cloud Router
  line. Tool count is now 44.

## 1.0.0

- Initial release.
- 42 tools across account, ordering (real wallet-debited orders with
  double-confirm), vps (read/write/destroy incl. reverse DNS), hosting
  (read/write/destroy incl. suspend), domains, billing, tickets, webhooks.
- Two transports: stdio (`444host-mcp`) and stateless Streamable HTTP
  (`444host-mcp-http`), hosted at `https://api.444host.com/mcp`.
- Bearer auth with `h444_…` API keys.
