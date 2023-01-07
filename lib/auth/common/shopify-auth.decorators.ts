import { PipeTransform, Type } from '@nestjs/common';
import { ShopifyOfflineSessionPipe } from '../pipes/offline-session.pipe';
import { ShopifySessionPipe } from '../pipes/session.pipe';
import { _GetDataAndContext } from '../../common/shopify.decorators';

export const ShopifySession = (
  optional?: boolean,
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => _GetDataAndContext(optional, ShopifySessionPipe, ...pipes);

export const ShopifyOfflineSession = (
  optional?: boolean,
  ...pipes: (PipeTransform | Type<PipeTransform>)[]
) => _GetDataAndContext(optional, ShopifyOfflineSessionPipe, ...pipes);
