import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { RequestNotEmbeddedError } from '../common/errors';
import { HttpAdapterHost } from '@nestjs/core';
import { Shopify } from '@shopify/shopify-api';
import { getReqRes } from '../../common/shopify.utils';
import { SHOPIFY_LOGGER } from '../../common/shopify.constants';
import { InjectShopify } from '../../common';

@Catch(RequestNotEmbeddedError)
export class RequestNotEmbeddedFilter
  implements ExceptionFilter<RequestNotEmbeddedError>
{
  constructor(
    private httpAdapterHost: HttpAdapterHost,
    @InjectShopify() private api: Shopify,
    @Inject(SHOPIFY_LOGGER) private logger: Shopify['logger'],
  ) {}

  async catch(exception: RequestNotEmbeddedError, host: ArgumentsHost) {
    const { req, res } = getReqRes(host);
    const { httpAdapter } = this.httpAdapterHost;
    const { shop } = exception;

    const embeddedUrl = await this.api.auth.getEmbeddedAppUrl({
      rawRequest: req,
      rawResponse: res,
    });

    this.logger.debug(
      `Request is not embedded but app is. Redirecting to ${embeddedUrl} to embed the app`,
      { shop },
    );

    httpAdapter.redirect(res, HttpStatus.FOUND, `${embeddedUrl}${req.path}`);
  }
}
