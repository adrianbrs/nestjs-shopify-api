import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { ShopifyAuthService } from '../services';
import { Shopify, CookieNotFound } from '@shopify/shopify-api';
import { InjectShopify } from '../../common';
import { InvalidSessionError, ShopMismatchError } from '../common/errors';

@Catch(CookieNotFound, ShopMismatchError, InvalidSessionError)
export class AuthErrorFilter
  implements
    ExceptionFilter<CookieNotFound | ShopMismatchError | InvalidSessionError>
{
  constructor(
    @InjectShopify() private api: Shopify,
    private authService: ShopifyAuthService,
  ) {}

  async catch(
    exception: CookieNotFound | ShopMismatchError | InvalidSessionError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    // Session was found but was invalid, so do a top level redirection
    if (exception instanceof InvalidSessionError) {
      let shop = this.api.utils.sanitizeShop(
        exception.shop ?? req.query.shop?.toString() ?? '',
      );

      const bearerToken = this.authService.getBearerToken(req);
      if (bearerToken && !shop) {
        const payload = await this.api.session.decodeSessionToken(bearerToken);
        shop = payload.dest.replace(/^https?:\/\//, '');
      }

      const redirectUrl = this.authService.getPath('auth', {
        shop,
      });

      this.authService.redirectTopLevel(res, Boolean(bearerToken), redirectUrl);
      return;
    }

    this.authService.redirectToAuth(req, res);
  }
}
