import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { toApiError } from '../errors/api-error';
import { AuthEvents } from '../services/auth-events.service';

/**
 * Normaliza cualquier error HTTP a {@link ApiError}. Ante un 401 de una llamada autenticada
 * (token vencido o revocado) notifica a AuthEvents para cerrar la sesión de forma centralizada.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authEvents = inject(AuthEvents);
  return next(request).pipe(
    catchError((error: unknown) => {
      const apiError = toApiError(error);
      const wasAuthenticatedCall = request.headers.get('Authorization')?.startsWith('Bearer ') ?? false;
      if (apiError.isUnauthorized && wasAuthenticatedCall) {
        authEvents.notifySessionExpired();
      }
      return throwError(() => apiError);
    }),
  );
};
