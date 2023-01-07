import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common';
import {
  ConfigParams as ApiConfigParams,
  ShopifyRestResources,
} from '@shopify/shopify-api';
import { SessionStorage } from './session-storage.interface';

export interface ShopifyModuleOptions<
  R extends ShopifyRestResources = any,
  S extends SessionStorage = SessionStorage,
> {
  api?: Partial<ApiConfigParams<R>>;
  sessionStorage?: S;
}

export interface ShopifyModuleOptionsLoaded<
  R extends ShopifyRestResources = any,
  S extends SessionStorage = SessionStorage,
> {
  api: Readonly<ApiConfigParams<R>>;
  sessionStorage: Readonly<S>;
}

export interface ShopifyOptionsFactory {
  createShopifyOptions(): Promise<ShopifyModuleOptions> | ShopifyModuleOptions;
}

export interface ShopifyModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ShopifyOptionsFactory>;
  useClass?: Type<ShopifyOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ShopifyModuleOptions> | ShopifyModuleOptions;
  inject?: InjectionToken[];
}
