import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';

export interface ShopifyWebhooksModuleOptions {
  path: string;
  version?: VersionValue;
}

export type ShopifyWebhooksModuleOptionsLoaded = ShopifyWebhooksModuleOptions;

export interface ShopifyWebhooksOptionsFactory {
  createWebhooksOptions():
    | Promise<ShopifyWebhooksModuleOptions>
    | ShopifyWebhooksModuleOptions;
}

export interface ShopifyWebhooksModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ShopifyWebhooksOptionsFactory>;
  useClass?: Type<ShopifyWebhooksOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ShopifyWebhooksModuleOptions> | ShopifyWebhooksModuleOptions;
  inject?: InjectionToken[];
}
