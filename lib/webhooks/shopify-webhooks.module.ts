import {
  DynamicModule,
  Inject,
  Module,
  OnModuleInit,
  Optional,
  flatten,
} from '@nestjs/common';
import { WebhookHandlerInterface, WebhookHandlerMetadata } from './interfaces';
import {
  ShopifyWebhooksModuleAsyncOptions,
  ShopifyWebhooksModuleOptions,
} from './interfaces/webhooks-options.interface';
import { SHOPIFY_WEBHOOKS_HANDLERS } from './common/shopify-webhooks.constants';
import { ShopifyWebhooksCoreModule } from './shopify-webhooks-core.module';
import {
  AddHandlersParams,
  DeliveryMethod,
  Shopify,
  WebhookHandler,
} from '@shopify/shopify-api';
import { InjectShopify } from '../common';
import { Type } from '@nestjs/common';
import { getHandlerProviders } from './shopify-webhooks.providers';
import { getFullRouterPath, pick } from '../common/shopify.utils';
import { ApplicationConfig } from '@nestjs/core';
import { ShopifyWebhooksController } from './shopify-webhooks.controller';
import { SHOPIFY_LOGGER } from '../common/shopify.constants';

@Module({})
export class ShopifyWebhooksModule implements OnModuleInit {
  constructor(
    @Inject(SHOPIFY_WEBHOOKS_HANDLERS)
    @Optional()
    private handlersMetadata: WebhookHandlerMetadata,
    @InjectShopify() private api: Shopify,
    private appConfig: ApplicationConfig,
    @Inject(SHOPIFY_LOGGER) private logger: Shopify['logger'],
  ) {}

  onModuleInit() {
    if (this.handlersMetadata) {
      const callbackUrl = getFullRouterPath(
        this.appConfig,
        ShopifyWebhooksController,
        'process',
      );

      // Fulfill missing callback URLs
      flatten(Object.values(this.handlersMetadata)).forEach((handler) => {
        if (
          handler.deliveryMethod === DeliveryMethod.Http &&
          !handler.callbackUrl
        ) {
          handler.callbackUrl = callbackUrl;
        }

        this.logger.info(`Add webhook handler`, {
          ...pick(handler, (k) => typeof handler[k] !== 'function'),
        } as WebhookHandler);
      });

      this.api.webhooks.addHandlers(this.handlersMetadata as AddHandlersParams);
    }
  }

  static forRoot(options: ShopifyWebhooksModuleOptions): DynamicModule {
    return {
      module: ShopifyWebhooksModule,
      imports: [ShopifyWebhooksCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(
    options: ShopifyWebhooksModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: ShopifyWebhooksModule,
      imports: [ShopifyWebhooksCoreModule.forRootAsync(options)],
    };
  }

  static register(
    handlers: (Type<WebhookHandlerInterface<any>> | AddHandlersParams)[],
  ): DynamicModule {
    const providers = getHandlerProviders(handlers);
    return {
      module: ShopifyWebhooksModule,
      providers,
    };
  }
}
