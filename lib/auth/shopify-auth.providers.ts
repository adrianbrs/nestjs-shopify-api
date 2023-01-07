import { Controller, Get, Provider } from '@nestjs/common';
import { SHOPIFY_AUTH_OPTIONS } from './common/shopify-auth.constants';
import {
  overrideControllerDecorator,
  overrideControllerPropertyDecorator,
} from '../common/shopify.utils';
import { ShopifyAuthController } from './shopify-auth.controller';
import {
  ShopifyAuthModuleOptions,
  ShopifyAuthModuleOptionsLoaded,
} from './interfaces';

/**
 * Hacky way to change controller paths in async way until NestJS
 * supports it out of the box
 * @see https://github.com/nestjs/nest/issues/1438#issuecomment-863446608
 */
export function getAsyncControllerPathsProvider(): Provider {
  return {
    provide: Symbol('ShopifyAuthPaths'),
    useFactory: ({
      path,
      callbackPath,
      version,
    }: ShopifyAuthModuleOptionsLoaded) => {
      // Controller versioning
      if (typeof version !== 'undefined') {
        overrideControllerDecorator(
          Controller({ version }),
          ShopifyAuthController,
        );
      }

      // Auth path
      overrideControllerPropertyDecorator(
        Get(path),
        ShopifyAuthController,
        'auth',
      );

      // Callback path
      overrideControllerPropertyDecorator(
        Get(callbackPath),
        ShopifyAuthController,
        'callback',
      );
    },
    inject: [SHOPIFY_AUTH_OPTIONS],
  };
}

export function getModuleOptions(
  options: ShopifyAuthModuleOptions,
): ShopifyAuthModuleOptionsLoaded {
  return {
    ...options,
    useOnlineTokens: !!options.useOnlineTokens,
  };
}
