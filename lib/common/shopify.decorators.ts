import {
  createParamDecorator,
  ExecutionContext,
  Inject,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { ShopifyProxyQuery } from '../interfaces';
import { SHOPIFY_TOKEN } from './shopify.constants';
import { GetShopQueryPipe } from './pipes/get-shop-query.pipe';
import { GetHostQueryPipe } from './pipes/get-host-query.pipe';
import { GetProxyQueryPipe } from './pipes/get-proxy-query.pipe';
import { isEmbedded } from './shopify.utils';

export const InjectShopify = () => Inject(SHOPIFY_TOKEN);

export const _GetContext: (
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => ParameterDecorator = createParamDecorator(
  (_: any, ctx: ExecutionContext) => ctx,
);

export const _GetDataAndContext = createParamDecorator(
  (data: any, ctx: ExecutionContext) => [data, ctx],
);

export const ShopQuery = (
  optional?: boolean,
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => _GetDataAndContext(optional, GetShopQueryPipe, ...pipes);

export const HostQuery = (
  optional?: boolean,
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => _GetDataAndContext(optional, GetHostQueryPipe, ...pipes);

export const ProxyQuery = (
  attribute: keyof ShopifyProxyQuery | undefined,
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => _GetDataAndContext(attribute, GetProxyQueryPipe, ...pipes);

export const IsEmbedded: (
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => ParameterDecorator = createParamDecorator(
  (_: any, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return isEmbedded(req);
  },
);
