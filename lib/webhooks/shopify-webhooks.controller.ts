import {
  Controller,
  Inject,
  InternalServerErrorException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Shopify } from '@shopify/shopify-api';
import { InjectShopify } from '../common';
import rawbody from 'raw-body';
import { SHOPIFY_LOGGER } from '../common/shopify.constants';

@Controller()
export class ShopifyWebhooksController {
  constructor(
    private httpAdapterHost: HttpAdapterHost,
    @InjectShopify() private api: Shopify,
    @Inject(SHOPIFY_LOGGER) private logger: Shopify['logger'],
  ) {}

  @Post()
  async process(@Req() req: any, @Res() res: any) {
    try {
      const buffer = req.rawBody
        ? req.rawBody
        : req.readable
        ? await rawbody(req)
        : undefined;

      if (!buffer) {
        throw new Error(
          `Cannot read request raw body, 'rawBody' option must be enabled or 'bodyParser' option must be disabled for webhook handlers to work properly`,
        );
      }

      const rawBody = buffer.toString('utf-8');

      await this.api.webhooks.process({
        rawBody,
        rawRequest: req,
        rawResponse: res,
      });
    } catch (err: any) {
      const { httpAdapter } = this.httpAdapterHost;
      this.logger.error(`Failed to process webhook: ${err.message}`, {
        err,
      });
      if (!httpAdapter.isHeadersSent(res)) {
        throw new InternalServerErrorException(err.message);
      }
    }
  }
}
