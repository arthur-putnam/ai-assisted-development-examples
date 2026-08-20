// Channel adapters module

export { EmailAdapter } from './email-adapter.js';
export type { EmailProviderClient, ChannelAdapter } from './email-adapter.js';

export { WebhookAdapter } from './webhook-adapter.js';
export type {
    HttpClient,
    HttpResponse,
    WebhookEndpointResolver,
    WebhookAdapterInterface,
} from './webhook-adapter.js';
