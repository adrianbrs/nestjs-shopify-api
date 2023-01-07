import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectShopify } from '../../common';
import { Shopify } from '@shopify/shopify-api';
import { SHOPIFY_LOGGER } from '../../common/shopify.constants';
import { pathToRegexp } from 'path-to-regexp';
import { SHOPIFY_AUTH_OPTIONS } from '../common/shopify-auth.constants';
import { getReqRes, isEmbedded } from '../../common/shopify.utils';
import { InvalidSessionError, RequestNotEmbeddedError } from '../common/errors';
import { ShopifyService } from '../../core/services';
import { ShopifyAuthGuard } from './shopify-auth.guard';
import { ShopifyAuthService } from '../services';
import { ShopifyAuthModuleOptions } from '../interfaces';

@Injectable()
export class ShopifyEmbeddedAuthGuard
  extends ShopifyAuthGuard
  implements CanActivate
{
  constructor(
    @InjectShopify() api: Shopify,
    authService: ShopifyAuthService,
    @Inject(SHOPIFY_LOGGER) logger: Shopify['logger'],
    @Inject(SHOPIFY_AUTH_OPTIONS) private authOptions: ShopifyAuthModuleOptions,
    private shopifyService: ShopifyService,
  ) {
    super(api, authService, logger);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req, res } = getReqRes(context);

    this.logger.debug('Running ensureInstalledOnShop');

    if (!this.api.config.isEmbeddedApp) {
      this.logger.warning(
        '`ShopifyShopInstalledGuard` should only be used in embedded apps; use `ShopifyAuthGuard` instead',
      );

      return super.canActivate(context);
    }

    const shop = this.shopifyService.getShop(req, true);

    this.logger.debug('Checking if shop has installed the app', { shop });

    const session = await this.authService.loadOfflineSession(shop);
    const { exitIFramePath } = this.authOptions;
    const exitIframeRE = exitIFramePath ? pathToRegexp(exitIFramePath) : null;

    if (!session && (!exitIframeRE || !req.originalUrl.match(exitIframeRE))) {
      this.logger.debug(
        'App installation was not found for shop, redirecting to auth',
        { shop },
      );

      throw new InvalidSessionError(shop);
    }

    if (this.api.config.isEmbeddedApp && !isEmbedded(req)) {
      if (await this.authService.sessionHasValidAccessToken(session)) {
        throw new RequestNotEmbeddedError(shop);
      } else {
        this.logger.debug(
          'Found a session, but it is not valid. Redirecting to auth',
          { shop },
        );

        throw new InvalidSessionError(shop);
      }
    }

    this.shopifyService.setCSPHeader(req, res);
    this.logger.debug('App is installed and ready to load', { shop });

    return true;
  }
}
