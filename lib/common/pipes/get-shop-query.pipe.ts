import {
  ExecutionContext,
  Inject,
  Injectable,
  PipeTransform,
  forwardRef,
} from '@nestjs/common';
import { ShopifyService } from '../../core/services';

@Injectable()
export class GetShopQueryPipe
  implements PipeTransform<[boolean, ExecutionContext], string | null>
{
  constructor(
    @Inject(forwardRef(() => ShopifyService))
    private shopifyService: ShopifyService,
  ) {}

  transform<O extends boolean>([optional, ctx]: [
    O,
    ExecutionContext,
  ]): O extends false ? string : string | null {
    const req = ctx.switchToHttp().getRequest();
    return this.shopifyService.getShop(req, !optional) as any;
  }
}
