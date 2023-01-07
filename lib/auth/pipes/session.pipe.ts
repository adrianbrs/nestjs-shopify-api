import { ExecutionContext, Injectable, PipeTransform } from '@nestjs/common';
import { getReqRes } from '../../common/shopify.utils';
import { ShopifyAuthService } from '../services';
import { Session } from '@shopify/shopify-api';

@Injectable()
export class ShopifySessionPipe
  implements
    PipeTransform<[boolean, ExecutionContext], Promise<Session | undefined>>
{
  constructor(private authService: ShopifyAuthService) {}

  transform<O extends boolean>([optional, ctx]: [O, ExecutionContext]): Promise<
    O extends true ? Session : Session | undefined
  > {
    const { req, res } = getReqRes(ctx);
    return this.authService.getCurrentSession(req, res, !optional) as any;
  }
}
