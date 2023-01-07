import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common';
import { HttpWebhookHandler, WebhookHandler } from '@shopify/shopify-api';

export interface ShopifyWebhookHandlerOptions
  extends Omit<
    HttpWebhookHandler,
    'deliveryMethod' | 'callbackUrl' | 'callback'
  > {
  topic: string | string[];
}

export type ShopifyWebhookHandlerParams =
  | string
  | ShopifyWebhookHandlerOptions
  | (string | ShopifyWebhookHandlerOptions)[];

export interface WebhookHandlerInterface<T = string> {
  handle(
    topic: string,
    shopDomain: string,
    body: T,
    webhookId: string,
    apiVersion?: string,
  ): Promise<void>;
}

export type WebhookHandlerMetadata = {
  [topic: string]: Partial<WebhookHandler>[];
};

export interface WebhookHandlerAsyncProvider
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<WebhookHandler>;
  useClass?: Type<WebhookHandler>;
  useFactory?: (...args: any[]) => Promise<WebhookHandler> | WebhookHandler;
  useValue?: WebhookHandler;
  inject?: InjectionToken[];
}
