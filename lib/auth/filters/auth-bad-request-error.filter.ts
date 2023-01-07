import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  InvalidHmacError,
  InvalidHostError,
  InvalidShopError,
} from '@shopify/shopify-api';

@Catch(InvalidShopError, InvalidHostError, InvalidHmacError)
export class AuthBadRequestErrorFilter extends BaseExceptionFilter<
  InvalidShopError | InvalidHostError | InvalidHmacError
> {
  catch(
    exception: InvalidShopError | InvalidHostError | InvalidHmacError,
    host: ArgumentsHost,
  ): void {
    super.catch(new BadRequestException(exception.message), host);
  }
}
