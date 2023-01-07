import { UnauthorizedException } from '@nestjs/common';

export class InvalidSessionError extends UnauthorizedException {
  constructor(public readonly shop?: string | null) {
    super('Session is not valid');
  }
}
