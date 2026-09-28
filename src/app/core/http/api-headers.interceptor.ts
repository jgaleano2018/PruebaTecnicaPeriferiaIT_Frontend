import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { isApiRequest, newRequestId } from './api-request';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Cabeceras comunes: Accept JSON, Content-Type para peticiones con cuerpo y un id de correlación. */
export const apiHeadersInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request, inject(APP_CONFIG))) {
    return next(request);
  }
  const setHeaders: Record<string, string> = { Accept: 'application/json' };
  if (!request.headers.has(REQUEST_ID_HEADER)) {
    setHeaders[REQUEST_ID_HEADER] = newRequestId();
  }
  if (request.body !== null && !request.headers.has('Content-Type')) {
    setHeaders['Content-Type'] = 'application/json';
  }
  return next(request.clone({ setHeaders }));
};
