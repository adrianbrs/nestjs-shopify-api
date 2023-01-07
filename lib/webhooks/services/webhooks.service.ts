import { Inject, Injectable } from '@nestjs/common';
import { Session, Shopify, gdprTopics } from '@shopify/shopify-api';
import { InjectShopify } from '../../common';
import { SHOPIFY_LOGGER } from '../../common/shopify.constants';

@Injectable()
export class ShopifyWebhooksService {
  static readonly GDPR_TOPICS_SET = new Set(gdprTopics);

  constructor(
    @InjectShopify() private api: Shopify,
    @Inject(SHOPIFY_LOGGER) private logger: Shopify['logger'],
  ) {}

  async registerWebhooks(session: Session) {
    await this.logger.debug('Registering webhooks', { shop: session.shop });

    const responsesByTopic = await this.api.webhooks.register({ session });

    for (const topic in responsesByTopic) {
      if (!Object.prototype.hasOwnProperty.call(responsesByTopic, topic)) {
        continue;
      }

      for (const response of responsesByTopic[topic]) {
        if (
          !response.success &&
          !ShopifyWebhooksService.GDPR_TOPICS_SET.has(topic)
        ) {
          const result: any = response.result;

          if (result.errors) {
            await this.logger.error(
              `Failed to register ${topic} webhook: ${result.errors[0].message}`,
              { shop: session.shop },
            );
          } else {
            await this.logger.error(
              `Failed to register ${topic} webhook: ${JSON.stringify(
                result.data,
              )}`,
              { shop: session.shop },
            );
          }
        }
      }
    }
  }
}
