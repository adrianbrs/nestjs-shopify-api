import { UnauthorizedException } from '@nestjs/common';

export class SessionNotFoundError extends UnauthorizedException {
  constructor(public readonly shop?: string) {
    super('Session not found');
  }
}
