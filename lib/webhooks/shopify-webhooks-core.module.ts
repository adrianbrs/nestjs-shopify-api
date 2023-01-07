import {
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
  Provider,
  Type,
} from '@nestjs/common';
import { SHOPIFY_WEBHOOKS_MODULE_OPTIONS } from './common/shopify-webhooks.constants';
import {
  ShopifyWebhooksModuleOptions,
  ShopifyWebhooksModuleAsyncOptions,
  ShopifyWebhooksOptionsFactory,
} from './interfaces';
import { ShopifyWebhooksController } from './shopify-webhooks.controller';
import { ShopifyWebhooksService } from './services/webhooks.service';
import { getAsyncControllerPathsProvider } from './shopify-webhooks.providers';

@Global()
@Module({
  providers: [ShopifyWebhooksService],
  controllers: [ShopifyWebhooksController],
  exports: [ShopifyWebhooksService],
})
export class ShopifyWebhooksCoreModule {
  static forRoot(options: ShopifyWebhooksModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: SHOPIFY_WEBHOOKS_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: ShopifyWebhooksCoreModule,
      providers: [optionsProvider, getAsyncControllerPathsProvider()],
      exports: [optionsProvider],
    };
  }

  static forRootAsync(
    options: ShopifyWebhooksModuleAsyncOptions,
  ): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: ShopifyWebhooksCoreModule,
      imports: options.imports,
      providers: [...asyncProviders, getAsyncControllerPathsProvider()],
      exports: asyncProviders,
    };
  }

  private static createAsyncProviders(
    options: ShopifyWebhooksModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<ShopifyWebhooksOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ShopifyWebhooksModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SHOPIFY_WEBHOOKS_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    const inject = [
      (options.useClass ||
        options.useExisting) as Type<ShopifyWebhooksOptionsFactory>,
    ];
    return {
      provide: SHOPIFY_WEBHOOKS_MODULE_OPTIONS,
      useFactory: async (optionsFactory: ShopifyWebhooksOptionsFactory) =>
        await optionsFactory.createWebhooksOptions(),
      inject,
    };
  }
}
