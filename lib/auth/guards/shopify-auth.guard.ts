import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Shopify } from '@shopify/shopify-api';
import { ResponseWithShopify } from '../interfaces';
import { ShopifyAuthService } from '../services/shopify-auth.service';
import { InjectShopify } from '../../common';
import { InvalidSessionError, ShopMismatchError } from '../common/errors';
import { SHOPIFY_LOGGER } from '../../common/shopify.constants';

@Injectable()
export class ShopifyAuthGuard implements CanActivate {
  constructor(
    @InjectShopify() protected api: Shopify,
    protected authService: ShopifyAuthService,
    @Inject(SHOPIFY_LOGGER) protected logger: Shopify['logger'],
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest();
    const res = httpCtx.getResponse<ResponseWithShopify>();

    const session = await this.authService.getCurrentSession(req, res);

    const shop = this.api.utils.sanitizeShop(
      (req.query.shop?.toString() || session?.shop) ?? '',
    );

    if (session && shop && session.shop !== shop) {
      this.logger.debug('Found a session for a different shop in the request', {
        currentShop: session.shop,
        requestShop: shop,
      });

      throw new ShopMismatchError(session.shop, shop);
    }

    this.logger.debug('Request session found and loaded', {
      shop: session?.shop,
    });

    if (session?.isActive(this.api.config.scopes)) {
      this.logger.debug('Request session exists and is active', {
        shop: session.shop,
      });

      if (await this.authService.hasValidAccessToken(session)) {
        this.logger.info('Request session has a valid access token', {
          shop: session.shop,
        });

        res.locals = res.locals ?? {};
        res.locals.shopify = {
          ...res.locals.shopify,
          session,
        };
        return true;
      }
    }

    throw new InvalidSessionError(shop);
  }
}
