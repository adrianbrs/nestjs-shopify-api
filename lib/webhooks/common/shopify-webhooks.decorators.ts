import { DeliveryMethod, WebhookHandler } from '@shopify/shopify-api';
import {
  ShopifyWebhookHandlerParams,
  WebhookHandlerMetadata,
} from '../interfaces/webhook-handler.interface';
import { SHOPIFY_WEBHOOK_HANDLER_METADATA } from './shopify-webhooks.constants';

export const SetWebhookHandler =
  (params: ShopifyWebhookHandlerParams): ClassDecorator =>
  (target) => {
    const optionsArr = Array.isArray(params) ? params : [params];
    const metadata: WebhookHandlerMetadata = {};

    const addHandler = (
      topics: string | string[],
      handler?: Partial<WebhookHandler>,
    ) => {
      const topicSet = new Set(Array.isArray(topics) ? topics : [topics]);

      for (const topic of topicSet) {
        metadata[topic] = (metadata[topic] ?? []).concat({
          ...handler,
          deliveryMethod: DeliveryMethod.Http,
        });
      }
    };

    for (const option of optionsArr) {
      const { topic, ...handlerOptions } =
        typeof option === 'string' ? { topic: option } : option;

      addHandler(topic, handlerOptions);
    }

    Reflect.defineMetadata(SHOPIFY_WEBHOOK_HANDLER_METADATA, metadata, target);
  };
