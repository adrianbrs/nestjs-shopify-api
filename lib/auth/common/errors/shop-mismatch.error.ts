import { ForbiddenException } from '@nestjs/common';

export class ShopMismatchError extends ForbiddenException {
  constructor(public currentShop: string, public requestShop: string) {
    super('Shop mismatch');
  }
}
