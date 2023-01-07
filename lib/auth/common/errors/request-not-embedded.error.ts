import { BadRequestException } from '@nestjs/common';

export class RequestNotEmbeddedError extends BadRequestException {
  constructor(public readonly shop: string) {
    super('App is embedded but request is not');
  }
}
