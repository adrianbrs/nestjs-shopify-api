import {
  Controller,
  Get,
  Inject,
  Optional,
  Req,
  Res,
  forwardRef,
} from '@nestjs/common';
import { ShopifyAuthService } from './services/shopify-auth.service';
import { ShopifyService } from '../core/services/shopify.service';
import { ShopifyWebhooksService } from '../webhooks/services/webhooks.service';
import { SHOPIFY_LOGGER } from '../common/shopify.constants';
import { Shopify } from '@shopify/shopify-api';

@Controller()
export class ShopifyAuthController {
  constructor(
    private shopifyService: ShopifyService,
    @Inject(forwardRef(() => ShopifyAuthService))
    private authService: ShopifyAuthService,
    @Optional() private webhooksService: ShopifyWebhooksService | undefined,
    @Inject(SHOPIFY_LOGGER) private logger: Shopify['logger'],
  ) {}

  @Get('/auth')
  async auth(@Req() req: any, @Res() res: any) {
    return this.authService.redirectToAuth(req, res);
  }

  @Get('/auth/callback')
  async callback(@Req() req: any, @Res() res: any) {
    const { api, sessionStorage } = this.shopifyService;

    const { session } = await api.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    await this.logger.debug('Callback is valid, storing session', {
      shop: session.shop,
      isOnline: session.isOnline,
    });

    await sessionStorage.storeSession(session);

    // If this is an offline OAuth process, register webhooks
    if (!session.isOnline) {
      await this.webhooksService?.registerWebhooks(session);
    }

    // If we're completing an offline OAuth process, immediately kick off the online one
    if (this.authService.isOnline && !session.isOnline) {
      await this.logger.debug(
        'Completing offline token OAuth, redirecting to online token OAuth',
        { shop: session.shop },
      );

      await this.authService.redirectToAuth(req, res);
      return false;
    }

    res.locals.shopify = {
      ...res.locals.shopify,
      session,
    };

    await this.logger.debug('Completed OAuth callback', {
      shop: session.shop,
      isOnline: session.isOnline,
    });

    await this.authService.redirectToShopifyOrAppRoot(req, res);
  }
}
