import { Logger } from '@nestjs/common';
import { LogFunction, LogSeverity } from '@shopify/shopify-api';

export const logger = new Logger('Shopify');

export const nestLogFunction: LogFunction = async (
  severity: LogSeverity,
  message: string,
): Promise<void> => {
  switch (severity) {
    case LogSeverity.Error:
      return logger.error(message);
    case LogSeverity.Warning:
      return logger.warn(message);
    case LogSeverity.Info:
      return logger.log(message);
    case LogSeverity.Debug:
      return logger.debug(message);
    default:
      return logger.verbose(message);
  }
};
