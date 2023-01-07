import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import {
  ShopifyModuleAsyncOptions,
  ShopifyModuleOptions,
  ShopifyOptionsFactory,
} from './interfaces/shopify-options.interface';
import { SHOPIFY_MODULE_OPTIONS } from './common/shopify.constants';
import { ShopifyService } from './core/services/shopify.service';
import {
  getLoggerProvider,
  getModuleOptions,
  getShopifyApiProvider,
} from './shopify.providers';

@Global()
@Module({
  providers: [ShopifyService, getLoggerProvider()],
  exports: [ShopifyService, getLoggerProvider()],
})
export class ShopifyModule {
  static async forRoot(options: ShopifyModuleOptions): Promise<DynamicModule> {
    const optionsProvider: Provider = {
      provide: SHOPIFY_MODULE_OPTIONS,
      useValue: await getModuleOptions(options),
    };

    const shopifyProvider = getShopifyApiProvider();

    return {
      module: ShopifyModule,
      providers: [optionsProvider, shopifyProvider],
      exports: [shopifyProvider],
    };
  }

  static async forRootAsync(
    options: ShopifyModuleAsyncOptions,
  ): Promise<DynamicModule> {
    const shopifyProvider = getShopifyApiProvider();
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: ShopifyModule,
      imports: options.imports,
      providers: [...asyncProviders, shopifyProvider],
      exports: [shopifyProvider],
    };
  }

  private static createAsyncProviders(
    options: ShopifyModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<ShopifyOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ShopifyModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SHOPIFY_MODULE_OPTIONS,
        useFactory: async (...args: any[]): Promise<ShopifyModuleOptions> =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          getModuleOptions(await Promise.resolve(options.useFactory!(...args))),
        inject: options.inject || [],
      };
    }
    const inject = [
      (options.useClass || options.useExisting) as Type<ShopifyOptionsFactory>,
    ];
    return {
      provide: SHOPIFY_MODULE_OPTIONS,
      useFactory: async (
        optionsFactory: ShopifyOptionsFactory,
      ): Promise<ShopifyModuleOptions> =>
        getModuleOptions(
          await Promise.resolve(optionsFactory.createShopifyOptions()),
        ),
      inject,
    };
  }
}
