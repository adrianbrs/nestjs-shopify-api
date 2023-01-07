import { Type } from '@nestjs/common';
import { SHOPIFY_WEBHOOK_HANDLER_METADATA } from './shopify-webhooks.constants';
import { isFunction } from '../../common/shopify.utils';
import {
  WebhookHandlerInterface,
  WebhookHandlerMetadata,
} from '../interfaces/webhook-handler.interface';

export const isWebhookHandlerInstance = (
  instance: any,
): instance is WebhookHandlerInterface<any> => {
  return (
    instance &&
    instance.constructor &&
    isWebhookHandlerClass(instance.constructor)
  );
};

export const isWebhookHandlerClass = (
  target: any,
): target is Type<WebhookHandlerInterface<any>> => {
  const prototype = target?.prototype as
    | WebhookHandlerInterface<any>
    | undefined;

  return (
    isFunction(target) &&
    !!prototype &&
    isFunction(prototype.handle) &&
    !!Reflect.getMetadata(SHOPIFY_WEBHOOK_HANDLER_METADATA, target)
  );
};

export const getHandlerMetadata = <T>(
  target: T,
): T extends WebhookHandlerInterface | Type<WebhookHandlerInterface<any>>
  ? WebhookHandlerMetadata
  : WebhookHandlerMetadata | null => {
  const constructor = isFunction(target) ? target : target?.constructor;

  if (isWebhookHandlerClass(constructor)) {
    return Reflect.getMetadata(SHOPIFY_WEBHOOK_HANDLER_METADATA, constructor);
  }
  return null as any;
};
