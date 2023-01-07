import { InjectionToken, ModuleMetadata, Type } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
export interface ShopifyAuthModuleOptions {
  path: string | string[];
  callbackPath: string | string[];
  version?: VersionValue;
  exitIFramePath?: string;
  useOnlineTokens?: boolean;
}

export interface ShopifyAuthModuleOptionsLoaded
  extends ShopifyAuthModuleOptions {
  useOnlineTokens: boolean;
}

export interface ShopifyAuthOptionsFactory {
  createAuthOptions():
    | Promise<ShopifyAuthModuleOptions>
    | ShopifyAuthModuleOptions;
}

export interface ShopifyAuthModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<ShopifyAuthOptionsFactory>;
  useClass?: Type<ShopifyAuthOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ShopifyAuthModuleOptions> | ShopifyAuthModuleOptions;
  inject?: InjectionToken[];
}
