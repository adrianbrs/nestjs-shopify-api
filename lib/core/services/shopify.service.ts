import { Inject, Injectable } from '@nestjs/common';
import { Shopify } from '@shopify/shopify-api';
import { InjectShopify } from '../../common';
import { getPathWithParams } from '../../common/shopify.utils';
import { SHOPIFY_MODULE_OPTIONS } from '../../common/shopify.constants';
import { ShopifyModuleOptionsLoaded } from '../../interfaces';
import { HttpAdapterHost } from '@nestjs/core';

@Injectable()
export class ShopifyService {
  get appHost() {
    return `${this.api.config.hostScheme}://${this.api.config.hostName}`;
  }

  get sessionStorage() {
    return this.moduleOptions.sessionStorage;
  }

  constructor(
    @InjectShopify() public readonly api: Shopify,
    @Inject(SHOPIFY_MODULE_OPTIONS)
    private moduleOptions: ShopifyModuleOptionsLoaded,
    private httpAdapterHost: HttpAdapterHost,
  ) {}

  getHostURL(
    input?: string | URL,
    params?: Record<string, any> | URLSearchParams,
  ) {
    return getPathWithParams(input ?? '', params, this.appHost);
  }

  getHost<R extends boolean = false>(
    req: any,
    required?: R,
  ): R extends true ? string : string | null {
    const host = this.api.utils.sanitizeHost(
      req.query.host?.toString(),
      required,
    );
    return host as any;
  }

  getShop<R extends boolean = false>(
    req: any,
    required?: R,
  ): R extends true ? string : string | null {
    const shop = this.api.utils.sanitizeShop(
      req.query.shop?.toString(),
      required,
    );
    return shop as any;
  }

  setCSPHeader(req: any, res: any): void {
    const { httpAdapter } = this.httpAdapterHost;
    const shop = this.getShop(req);

    const setHeader = (policy: string) => {
      httpAdapter.setHeader(
        res,
        'Content-Security-Policy',
        `frame-ancestors ${policy};`,
      );
    };

    if (this.api.config.isEmbeddedApp && shop) {
      setHeader(
        `https://${encodeURIComponent(shop)} https://admin.shopify.com`,
      );
    } else {
      setHeader("'none'");
    }
  }
}
