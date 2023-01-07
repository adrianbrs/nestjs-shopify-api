import { ExecutionContext, Injectable, PipeTransform } from '@nestjs/common';
import { ShopifyAuthService } from '../services';
import { Session } from '@shopify/shopify-api';

@Injectable()
export class ShopifyOfflineSessionPipe
  implements
    PipeTransform<[boolean, ExecutionContext], Promise<Session | undefined>>
{
  constructor(private authService: ShopifyAuthService) {}

  transform<O extends boolean>([optional, ctx]: [O, ExecutionContext]): Promise<
    O extends true ? Session : Session | undefined
  > {
    const request = ctx.switchToHttp().getRequest();
    return this.authService.loadOfflineSession(
      request.query.shop?.toString(),
      !optional,
    ) as any;
  }
}
