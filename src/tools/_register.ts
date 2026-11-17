import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Host444Client } from '../client/http';
import { registerAccountTools } from './account';
import { registerOrderTools } from './orders';
import { registerServerTools } from './servers';
import { registerPoolTools } from './pools';
import { registerHostingTools } from './hosting';
import { registerHostingPanelTools } from './hosting-panel';
import { registerMailTools } from './mail';
import { registerDomainTools } from './domains';
import { registerBillingTools } from './billing';
import { registerTicketTools } from './tickets';
import { registerWebhookTools } from './webhooks';

export function registerAllTools(server: McpServer, client: Host444Client): void {
  registerAccountTools(server, client);
  registerOrderTools(server, client);
  registerServerTools(server, client);
  registerPoolTools(server, client);
  registerHostingTools(server, client);
  registerHostingPanelTools(server, client);
  registerMailTools(server, client);
  registerDomainTools(server, client);
  registerBillingTools(server, client);
  registerTicketTools(server, client);
  registerWebhookTools(server, client);
}
