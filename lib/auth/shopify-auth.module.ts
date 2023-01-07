import {
  DynamicModule,
  Global,
  Inject,
  Module,
  Provider,
  Type,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SHOPIFY_AUTH_OPTIONS } from './common/shopify-auth.constants';
import {
  ShopifyAuthModuleAsyncOptions,
  ShopifyAuthModuleOptions,
  ShopifyAuthOptionsFactory,
} from './interfaces';
import { ShopifyAuthService } from './services/shopify-auth.service';
import { AuthBadRequestErrorFilter } from './filters/auth-bad-request-error.filter';
import { ShopifyAuthController } from './shopify-auth.controller';
import {
  getAsyncControllerPathsProvider,
  getModuleOptions,
} from './shopify-auth.providers';
import { OnModuleInit } from '@nestjs/common';
import { Shopify } from '@shopify/shopify-api';
import { InjectShopify } from '../common';
import { AuthErrorFilter } from './filters/auth-error.filter';
import { SHOPIFY_LOGGER } from '../common/shopify.constants';
import { RequestNotEmbeddedFilter } from './filters/request-not-embedded.filter';

@Global()
@Module({
  controllers: [ShopifyAuthController],
  providers: [
    ShopifyAuthService,
    {
      provide: APP_FILTER,
      useClass: AuthErrorFilter,
    },
    {
      provide: APP_FILTER,
      useClass: AuthBadRequestErrorFilter,
    },
    {
      provide: APP_FILTER,
      useClass: RequestNotEmbeddedFilter,
    },
  ],
  exports: [ShopifyAuthService],
})
export class ShopifyAuthModule implements OnModuleInit {
  constructor(
    @Inject(SHOPIFY_AUTH_OPTIONS)
    private readonly authOptions: ShopifyAuthModuleOptions,
    @InjectShopify() private readonly api: Shopify,
    @Inject(SHOPIFY_LOGGER) private readonly logger: Shopify['logger'],
  ) {}

  onModuleInit() {
    if (this.api.config.isEmbeddedApp && !this.authOptions.exitIFramePath) {
      this.logger.warning(`
      Embedded apps must set a valid 'exitIFramePath' option to handle escaping the iframe
      using Shopify App Bridge. The module will use a default escape strategy, but we highly
      recommend that you create your own within your frontend app bundle to increase the
      chance of the user's browser to access the Shopify App Bridge code from the cache.
      (https://shopify.dev/apps/auth/oauth/update/node-php#step-1-add-a-new-iframe-escape-route)
      `);
    }
  }

  static forRoot(options: ShopifyAuthModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: SHOPIFY_AUTH_OPTIONS,
      useValue: getModuleOptions(options),
    };

    return {
      module: ShopifyAuthModule,
      providers: [optionsProvider, getAsyncControllerPathsProvider()],
      exports: [optionsProvider],
    };
  }

  static forRootAsync(options: ShopifyAuthModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: ShopifyAuthModule,
      imports: options.imports,
      providers: [...asyncProviders, getAsyncControllerPathsProvider()],
      exports: [...asyncProviders],
    };
  }

  private static createAsyncProviders(
    options: ShopifyAuthModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<ShopifyAuthOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ShopifyAuthModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SHOPIFY_AUTH_OPTIONS,
        useFactory: async (...args: any[]) =>
          getModuleOptions(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await Promise.resolve(options.useFactory!(...args)),
          ),
        inject: options.inject || [],
      };
    }
    const inject = [
      (options.useClass ||
        options.useExisting) as Type<ShopifyAuthOptionsFactory>,
    ];
    return {
      provide: SHOPIFY_AUTH_OPTIONS,
      useFactory: async (optionsFactory: ShopifyAuthOptionsFactory) =>
        getModuleOptions(await optionsFactory.createAuthOptions()),
      inject,
    };
  }
}
