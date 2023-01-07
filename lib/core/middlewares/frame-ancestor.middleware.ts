import { Injectable, NestMiddleware } from '@nestjs/common';
import { ShopifyService } from '../services';

@Injectable()
export class ShopifyFrameAncestorMiddleware implements NestMiddleware {
  constructor(private shopifyService: ShopifyService) {}

  use(req: any, res: any, next: (error?: any) => void) {
    this.shopifyService.setCSPHeader(req, res);
    next();
  }
}
