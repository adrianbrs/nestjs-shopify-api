import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Shopify } from '@shopify/shopify-api';
import { SHOPIFY_PROXY_REQUEST_MARK } from '../../common/shopify.constants';
import { InjectShopify } from '../../common';
import { validateProxyQueryHmac } from '../../common/shopify.utils';

@Injectable()
export class ShopifyAppProxyGuard implements CanActivate {
  constructor(@InjectShopify() private api: Shopify) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const valid = validateProxyQueryHmac(
      request.url,
      this.api.config.apiSecretKey,
    );
    if (!valid) {
      return false;
    }

    Object.defineProperty(request, SHOPIFY_PROXY_REQUEST_MARK, {
      value: true,
      configurable: true,
    });

    return true;
  }
}
