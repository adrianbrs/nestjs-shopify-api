import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpResponseError, Session, Shopify } from '@shopify/shopify-api';
import { SHOPIFY_AUTH_OPTIONS } from '../common/shopify-auth.constants';
import { ShopifyAuthModuleOptionsLoaded } from '../interfaces';
import {
  getFullRouterPath,
  getPathWithParams,
  isEmbedded,
} from '../../common/shopify.utils';
import { ShopifyService } from '../../core/services';
import { ShopifyAuthController } from '../shopify-auth.controller';
import { ApplicationConfig, HttpAdapterHost } from '@nestjs/core';
import { SessionNotFoundError } from '../common/errors';
import { getIFrameEscapeHTML } from '../common/iframe-escape.util';
import { SHOPIFY_LOGGER } from '../../common/shopify.constants';

export type AuthPathTypes = keyof ShopifyAuthController;

@Injectable()
export class ShopifyAuthService {
  get isOnline() {
    return !!this.options.useOnlineTokens;
  }

  constructor(
    private shopifyService: ShopifyService,
    @Inject(SHOPIFY_AUTH_OPTIONS)
    readonly options: ShopifyAuthModuleOptionsLoaded,
    private appConfig: ApplicationConfig,
    private httpAdapterHost: HttpAdapterHost,
    @Inject(SHOPIFY_LOGGER) private logger: Shopify['logger'],
  ) {}

  getPath(type: AuthPathTypes, params?: Record<string, any>): string {
    return getPathWithParams(
      getFullRouterPath(this.appConfig, ShopifyAuthController, type),
      params,
    );
  }

  async getCurrentSession<O extends boolean>(
    req: any,
    res: any,
    required: O = false as O,
  ): Promise<O extends true ? Session : Session | undefined> {
    if (res.locals.shopify?.session) {
      return res.locals.shopify.session;
    }
    const { api } = this.shopifyService;
    let session: Session | undefined;
    const sessionId = await api.session.getCurrentId({
      isOnline: !!this.options.useOnlineTokens,
      rawRequest: req,
      rawResponse: res,
    });

    if (sessionId) {
      session = await this.shopifyService.sessionStorage.loadSession(sessionId);
    }

    if (!session && required) {
      throw new SessionNotFoundError();
    }

    return session as any;
  }

  async loadOfflineSession<O extends boolean>(
    shop?: string | null,
    required: O = false as O,
  ): Promise<O extends true ? Session : Session | undefined> {
    let session: Session | undefined;

    if (shop) {
      const { api } = this.shopifyService;
      const sessionId = await api.session.getOfflineId(shop);

      if (sessionId) {
        session = await this.shopifyService.sessionStorage.loadSession(
          sessionId,
        );
      }
    }

    if (!session && required) {
      throw new SessionNotFoundError(shop ?? undefined);
    }

    return session as any;
  }

  async redirectToAuth(req: any, res: any): Promise<boolean> {
    const { api } = this.shopifyService;
    const { httpAdapter } = this.httpAdapterHost;
    const shop = this.shopifyService.getShop(req, true);
    const authPath = this.getPath('auth');

    // Client side redirect
    if (isEmbedded(req)) {
      const exitIFramePath = this.options.exitIFramePath;

      const host = this.shopifyService.getHost(req, true);

      const redirectUri = this.shopifyService.getHostURL(authPath, {
        shop,
        host,
      });

      if (exitIFramePath) {
        await this.logger.debug(
          `Redirecting to auth while embedded, going to ${exitIFramePath}`,
          { shop },
        );

        httpAdapter.redirect(
          res,
          HttpStatus.FOUND,
          getPathWithParams(exitIFramePath, {
            ...req.query,
            shop,
            redirectUri,
          }),
        );
      } else {
        // Send default iframe escaping strategy with Shopify App Bridge
        httpAdapter.reply(
          res,
          getIFrameEscapeHTML(api, shop, host, redirectUri),
        );
        httpAdapter.end(res);
      }
    } else {
      const callbackPath = this.getPath('callback');

      // Server side redirect
      await this.logger.debug(
        `Redirecting to auth at ${authPath}, with callback ${callbackPath}`,
        { shop, isOnline: this.isOnline },
      );

      await api.auth.begin({
        callbackPath,
        shop,
        isOnline: this.isOnline,
        rawRequest: req,
        rawResponse: res,
      });
    }

    return true;
  }

  async hasValidAccessToken(session: Session): Promise<boolean> {
    try {
      const { api } = this.shopifyService;
      const client = new api.clients.Graphql({ session });
      await client.query({
        data: `
        {
          shop {
            name
          }
        }`, // GraphQL query to test if the access token is still valid
      });
      return true;
    } catch (err: any) {
      if (
        err instanceof HttpResponseError &&
        err.response.code === HttpStatus.UNAUTHORIZED
      ) {
        return false;
      }
      throw err;
    }
  }

  async sessionHasValidAccessToken(
    session: Session | undefined | null,
  ): Promise<boolean> {
    if (!session) {
      return false;
    }

    try {
      const { api } = this.shopifyService;
      return (
        session.isActive(api.config.scopes) &&
        (await this.hasValidAccessToken(session))
      );
    } catch (error) {
      this.logger.error(`Could not check if session was valid: ${error}`, {
        shop: session.shop,
      });
      return false;
    }
  }

  async redirectTopLevel(
    res: any,
    isEmbedded: boolean,
    redirectUrl: string,
  ): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;

    if (isEmbedded) {
      await this.logger.debug(
        `Redirecting to top level at ${redirectUrl} while embedded, returning headers`,
      );

      httpAdapter.status(res, HttpStatus.FORBIDDEN);
      httpAdapter.setHeader(
        res,
        'X-Shopify-API-Request-Failure-Reauthorize',
        '1',
      );
      httpAdapter.setHeader(
        res,
        'X-Shopify-API-Request-Failure-Reauthorize-Url',
        redirectUrl,
      );
      httpAdapter.end(res);
    } else {
      await this.logger.debug(
        `Redirecting to ${redirectUrl} while at the top level`,
      );

      httpAdapter.redirect(res, HttpStatus.FOUND, redirectUrl);
    }
  }

  getBearerToken(req: any): string | undefined {
    const [, token] = req.headers?.authorization?.match(/Bearer (.*)/) ?? [];
    return token;
  }

  async redirectToShopifyOrAppRoot(req: any, res: any): Promise<void> {
    const { api } = this.shopifyService;
    const { httpAdapter } = this.httpAdapterHost;

    const { shop } = await this.getCurrentSession(req, res, true);

    if (httpAdapter.isHeadersSent(res)) {
      await this.logger.info(
        'Response headers have already been sent, skipping redirection to host',
        { shop },
      );

      return;
    }

    const host = this.shopifyService.getHost(req, true);

    const redirectUrl = api.config.isEmbeddedApp
      ? await api.auth.getEmbeddedAppUrl({
          rawRequest: req,
          rawResponse: res,
        })
      : getPathWithParams('/', {
          shop: shop,
          host: encodeURIComponent(host),
        });

    await this.logger.debug(`Redirecting to host at ${redirectUrl}`, {
      shop,
    });

    httpAdapter.redirect(res, HttpStatus.FOUND, redirectUrl);
  }
}
