import { ExecutionContext, Injectable, PipeTransform } from '@nestjs/common';
import { ShopifyService } from '../../core/services';

@Injectable()
export class GetHostQueryPipe
  implements PipeTransform<[boolean, ExecutionContext], string | null>
{
  constructor(private shopifyService: ShopifyService) {}

  transform<O extends boolean>([optional, ctx]: [
    O,
    ExecutionContext,
  ]): O extends true ? string | null : string {
    const req = ctx.switchToHttp().getRequest();
    return this.shopifyService.getHost(req, !optional) as any;
  }
}
