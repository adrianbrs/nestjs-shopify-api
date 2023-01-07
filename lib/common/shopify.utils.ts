import {
  ArgumentsHost,
  ExecutionContext,
  RequestMethod,
  Type,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import { SHOPIFY_PROXY_REQUEST_MARK } from './shopify.constants';
import { ApplicationConfig } from '@nestjs/core';
import { isRouteExcluded } from '@nestjs/core/router/utils';
import crypto from 'crypto';

export const normalizePath = (...paths: string[]) => {
  const path = paths.map(p => p.trim()).join('/');

  if (!path || path === '/') {
    return '/';
  }

  return `/${path}`.replace(/\/+/g, '/').replace(/\/$/, '');
};

export const getReqRes = <Req = any, Res = any>(
  ctx: ExecutionContext | ArgumentsHost,
) => {
  const httpHost = ctx.switchToHttp();
  return {
    req: httpHost.getRequest<Req>(),
    res: httpHost.getResponse<Res>(),
  };
};

/**
 * Returns a `URLSearchParams` instance from a URL, path or query string.
 * @param urlOrPath URL, path or query string
 * @returns Instance of `URLSearchParams`
 */
export const getSearchParams = (urlOrPath: string) => {
  if (!urlOrPath) {
    return new URLSearchParams();
  }
  const qi = urlOrPath.indexOf('?');
  if (qi !== -1) {
    urlOrPath = urlOrPath.substring(qi + 1);
  }
  const searchParams = new URLSearchParams(urlOrPath);
  return searchParams;
};

/**
 * Verify that the request came from Shopify. Compute the HMAC digest according
 * to the `SHA-256` hash function and compare it to the value in the `signature` property.
 * If the values match, then the request was sent from Shopify.
 *
 * This function uses the `crypto`'s `timingSafeEqual` method to compare the digests and prevent timing attacks.
 *
 * @see https://shopify.dev/apps/online-store/app-proxies#calculate-a-digital-signature
 * @param query
 * @param secret
 * @returns
 */
export const validateProxyQueryHmac = (
  urlOrPath: string,
  secret: string,
): boolean => {
  if (!urlOrPath || typeof urlOrPath !== 'string' || !secret) {
    return false;
  }
  const searchParams = getSearchParams(urlOrPath);
  const signature = searchParams.get('signature');
  searchParams.delete('signature');

  const input = Array.from(searchParams.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('');

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(input, 'utf-8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'utf-8'),
      Buffer.from(signature as string, 'utf-8'),
    );
  } catch {
    return false;
  }
};

export const isProxyRequest = (req: any) => {
  return req && req[SHOPIFY_PROXY_REQUEST_MARK] === true;
};

/**
 * Helper function to override a controller's decorators
 * @see https://github.com/nestjs/nest/issues/1438#issuecomment-1014946202
 */
export const overrideControllerDecorator = (
  decorator: ClassDecorator,
  controllerType: Type<any>,
) => {
  decorator(controllerType);
};

/**
 * Helper function to override a controller's property decorators
 * @see https://github.com/nestjs/nest/issues/1438#issuecomment-1014946202
 */
export const overrideControllerPropertyDecorator = <T extends Type<any>>(
  decorator: MethodDecorator,
  controllerType: T,
  property: Exclude<keyof InstanceType<T>, number>,
) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    controllerType.prototype,
    property,
  );

  if (!descriptor) {
    throw new Error(
      `Cannot override controler property decorator, invalid descriptor: ${descriptor}`,
    );
  }

  decorator(controllerType, property, descriptor);
};

/**
 * Helper function to get absolute (full) path of a controller,
 * including global prefix and URI versioning options
 */
export const getFullRouterPath = <T extends Type<any>>(
  appConfig: ApplicationConfig,
  controllerType: T,
  property: Exclude<keyof InstanceType<T>, number>,
): string => {
  const target = Object.getOwnPropertyDescriptor(
    controllerType.prototype,
    property,
  )?.value;

  if (!target) {
    throw new Error(`Cannot get full router path, invalid target: ${target}`);
  }

  let path: string =
    [].concat(Reflect.getMetadata(PATH_METADATA, target))[0] || '/';

  const method: RequestMethod =
    Reflect.getMetadata(METHOD_METADATA, target) || RequestMethod.GET;
  const globalPrefix = appConfig.getGlobalPrefix();
  const versioning = appConfig.getVersioning();
  const controllerPath =
    [].concat(Reflect.getMetadata(PATH_METADATA, controllerType))[0] || '/';

  if (controllerPath) {
    path = normalizePath(controllerPath, path);
  }

  if (versioning?.type === VersioningType.URI) {
    const { defaultVersion, prefix = 'v' } = versioning;

    const version: string | symbol =
      Reflect.getMetadata(VERSION_METADATA, controllerType) ?? defaultVersion;

    if (version && version !== VERSION_NEUTRAL) {
      const versionPath = `${prefix || ''}${version as string}`;
      path = normalizePath(versionPath, path);
    }
  }

  if (globalPrefix) {
    const { exclude } = appConfig.getGlobalPrefixOptions();

    if (!exclude || !isRouteExcluded(exclude, path, method)) {
      path = normalizePath(globalPrefix, path);
    }
  }

  return path;
};

export const getPathWithParams = (
  input: string | URL,
  params?: Record<string, any> | URLSearchParams,
  origin?: string | URL,
): string => {
  const url = new URL(input.toString(), 'http://localhost');

  if (typeof params === 'object') {
    const entries =
      params instanceof URLSearchParams
        ? params.entries()
        : Object.entries(params);
    for (const [name, value] of entries) {
      url.searchParams.set(name, value);
    }
  }

  const path = `${url.pathname}${url.search}${url.hash}`;

  if (origin) {
    return new URL(path, origin).toString();
  }
  return path;
};

export const isEmbedded = (req: any) => req?.query.embedded === '1';

export const isFunction = (obj: any): obj is (...args: any[]) => any =>
  typeof obj === 'function';

export const pick = <T extends object, K extends keyof T>(
  obj: T,
  props: K[] | ((key: K) => boolean),
): Pick<T, K> => {
  const propSet = Array.isArray(props) ? new Set(props) : null;

  const has = (k: string) => {
    if (propSet) {
      return propSet.has(k as K);
    } else if (isFunction(props)) {
      return props(k as K);
    }
    return false;
  };

  return (
    obj
      ? Object.entries(obj).reduce((result, [key, val]) => {
          if (has(key)) {
            (result as any)[key] = val;
          }
          return result;
        }, {} as Pick<T, K>)
      : {}
  ) as Pick<T, K>;
};
