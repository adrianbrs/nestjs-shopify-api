import {
  ConfigParams as ApiConfigParams,
  LATEST_API_VERSION,
  Shopify,
  shopifyApi,
} from '@shopify/shopify-api';
import {
  SHOPIFY_LOGGER,
  SHOPIFY_MODULE_OPTIONS,
  SHOPIFY_TOKEN,
  USER_AGENT_PREFIX,
} from './common/shopify.constants';
import { ShopifyModuleOptions, ShopifyModuleOptionsLoaded } from './interfaces';
import { Provider } from '@nestjs/common';
import { InMemorySessionStorage } from './core/in-memory-session-storage';
import { nestLogFunction } from './common/shopify.logger';

export function getShopifyApiProvider(): Provider {
  return {
    provide: SHOPIFY_TOKEN,
    useFactory: ({ api: apiOptions }: ShopifyModuleOptionsLoaded) => {
      return shopifyApi(apiOptions);
    },
    inject: [SHOPIFY_MODULE_OPTIONS],
  };
}

export async function getModuleOptions(
  options: ShopifyModuleOptions,
): Promise<ShopifyModuleOptionsLoaded> {
  const api = await getApiOptions(options.api);
  const sessionStorage = options.sessionStorage ?? new InMemorySessionStorage();

  return {
    api,
    sessionStorage,
  };
}

async function getApiOptions(
  partialOptions: Partial<ApiConfigParams> = {},
): Promise<ApiConfigParams> {
  const { userAgentPrefix, ...apiConfig } = partialOptions;

  const apiVersion = apiConfig.apiVersion ?? LATEST_API_VERSION;
  const { restResources } =
    apiConfig.restResources ??
    (await import(`@shopify/shopify-api/rest/admin/${apiVersion}`).catch(
      () => null,
    ));

  return {
    apiKey: process.env.SHOPIFY_API_KEY ?? '',
    apiSecretKey: process.env.SHOPIFY_API_SECRET ?? '',
    scopes: process.env.SCOPES?.split(',') ?? [],
    hostScheme: process.env.HOST?.split('://')[0] as 'http' | 'https',
    hostName: process.env.HOST?.replace(/https?:\/\//, '') ?? '',
    isEmbeddedApp: true,
    ...(process.env.SHOP_CUSTOM_DOMAIN && {
      customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN],
    }),
    ...apiConfig,
    apiVersion,
    restResources,
    logger: {
      log: nestLogFunction,
      ...apiConfig.logger,
    },
    userAgentPrefix: `${
      userAgentPrefix ? `${userAgentPrefix} | ` : ''
    }${USER_AGENT_PREFIX}`,
  };
}

export function getLoggerProvider(): Provider {
  return {
    provide: SHOPIFY_LOGGER,
    useFactory: (api: Shopify): Shopify['logger'] => {
      const { logger } = api;
      const baseContext = { package: 'shopify-nestjs' };

      return {
        ...logger,
        log: async (severity, message, context = {}) =>
          logger.log(severity, message, { ...baseContext, ...context }),
        debug: async (message, context = {}) =>
          logger.debug(message, { ...baseContext, ...context }),
        info: async (message, context = {}) =>
          logger.info(message, { ...baseContext, ...context }),
        warning: async (message, context = {}) =>
          logger.warning(message, { ...baseContext, ...context }),
        error: async (message, context = {}) =>
          logger.error(message, { ...baseContext, ...context }),
        deprecated: async (version: string, message: string) =>
          logger.warning(`[Deprecated | ${version}] ${message}`, {
            ...baseContext,
          }),
      };
    },
    inject: [SHOPIFY_TOKEN],
  };
}
