import { Controller, Provider } from '@nestjs/common';
import { overrideControllerDecorator } from '../common/shopify.utils';
import { ShopifyWebhooksController } from './shopify-webhooks.controller';
import {
  SHOPIFY_WEBHOOKS_HANDLERS,
  SHOPIFY_WEBHOOKS_MODULE_OPTIONS,
  SHOPIFY_WEBHOOKS_PATH,
} from './common/shopify-webhooks.constants';
import {
  getHandlerMetadata,
  isWebhookHandlerClass,
} from './common/shopify-webhooks.utils';
import { AddHandlersParams, WebhookHandler } from '@shopify/shopify-api';
import { Type } from '@nestjs/common';
import {
  WebhookHandlerInterface,
  ShopifyWebhooksModuleOptionsLoaded,
} from './interfaces';

/**
 * Hacky way to change controller paths in async way until NestJS
 * supports it out of the box
 * @see https://github.com/nestjs/nest/issues/1438#issuecomment-863446608
 */
export function getAsyncControllerPathsProvider(): Provider {
  return {
    provide: SHOPIFY_WEBHOOKS_PATH,
    useFactory: ({ path, version }: ShopifyWebhooksModuleOptionsLoaded) => {
      overrideControllerDecorator(
        Controller({
          path,
          version,
        }),
        ShopifyWebhooksController,
      );
    },
    inject: [SHOPIFY_WEBHOOKS_MODULE_OPTIONS],
  };
}

export function getHandlerProviders(
  handlers: (Type<WebhookHandlerInterface<any>> | AddHandlersParams)[],
): Provider[] {
  const handlerClasses: Type<WebhookHandlerInterface<any>>[] = [];
  const handlerParams: AddHandlersParams[] = [];

  for (const handler of handlers) {
    if (isWebhookHandlerClass(handler)) {
      handlerClasses.push(handler);
    } else {
      handlerParams.push(handler);
    }
  }

  const providers: Provider[] = [...handlerClasses];

  const handlersProvider: Provider = {
    provide: SHOPIFY_WEBHOOKS_HANDLERS,
    useFactory: (...handlerInstances: WebhookHandlerInterface<any>[]) => {
      const resultHandlerParams: Record<string, Partial<WebhookHandler>[]> = {};

      const addHandler = (
        topic: string,
        handlers: Partial<WebhookHandler> | Partial<WebhookHandler>[],
      ) => {
        if (!resultHandlerParams[topic]) {
          resultHandlerParams[topic] = [];
        }
        resultHandlerParams[topic].push(
          ...(Array.isArray(handlers) ? handlers : [handlers]),
        );
      };

      for (const params of handlerParams) {
        Object.entries(params).forEach(([topic, handlers]) => {
          addHandler(topic, handlers);
        });
      }

      for (const handlerInstance of handlerInstances) {
        const metadata = getHandlerMetadata(handlerInstance);
        const callback = handlerInstance.handle.bind(handlerInstance);

        Object.entries(metadata).forEach(([topic, handlers]) =>
          addHandler(
            topic,
            handlers.map(handler => ({
              ...handler,
              callback,
            })),
          ),
        );
      }

      return resultHandlerParams;
    },
    inject: handlerClasses,
  };

  providers.push(handlersProvider);

  return providers;
}
