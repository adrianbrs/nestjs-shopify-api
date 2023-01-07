import {
  ExecutionContext,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { Shopify } from '@shopify/shopify-api';
import { isProxyRequest } from '../shopify.utils';
import { ShopifyProxyQuery } from '../../interfaces';
import { SHOPIFY_TOKEN } from '../shopify.constants';

@Injectable()
export class GetProxyQueryPipe
  implements
    PipeTransform<
      [keyof ShopifyProxyQuery, ExecutionContext],
      ShopifyProxyQuery | ShopifyProxyQuery[keyof ShopifyProxyQuery] | null
    >
{
  constructor(@Inject(SHOPIFY_TOKEN) private api: Shopify) {}

  transform<T extends keyof ShopifyProxyQuery | undefined>([attribute, ctx]: [
    T,
    ExecutionContext,
  ]):
    | (T extends keyof ShopifyProxyQuery
        ? ShopifyProxyQuery[T]
        : ShopifyProxyQuery)
    | null {
    const req = ctx.switchToHttp().getRequest();
    if (!isProxyRequest(req)) {
      return null;
    }
    const { shop, logged_in_customer_id, path_prefix, signature, timestamp } =
      req.query;

    const proxyQuery: ShopifyProxyQuery = {
      shop: this.api.utils.sanitizeShop(shop, true) as string,
      logged_in_customer_id,
      path_prefix,
      signature,
      timestamp: Number(timestamp),
    };

    return (attribute ? proxyQuery[attribute] : proxyQuery) as any;
  }
}
