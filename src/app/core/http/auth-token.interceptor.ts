import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { AuthStore } from '../../state/auth.store';
import { isApiRequest } from './api-request';

/**
 * Agrega el JWT (Authorization: Bearer) a las llamadas al API. Si la petición ya trae una
 * cabecera Authorization (p. ej. el login con Basic) se respeta.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).token();
  if (!token || request.headers.has('Authorization') || !isApiRequest(request, inject(APP_CONFIG))) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
