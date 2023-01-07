import { Session } from '@shopify/shopify-api';

export interface ShopifyResponseLocals {
  shopify?: {
    session?: Session;
  };
}

export type ResponseWithShopify<T = Record<string, any>> = T & {
  locals?: ShopifyResponseLocals;
};
