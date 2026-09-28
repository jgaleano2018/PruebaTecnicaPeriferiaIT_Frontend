import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { retry, throwError, timer } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';

const RETRYABLE_STATUS = new Set([0, 502, 503, 504]);

/**
 * Reintento con backoff exponencial SOLO para GET (idempotentes) ante fallas transitorias.
 * Los POST no se reintentan aquí: el FeedStore los reintenta reutilizando la Idempotency-Key.
 */
export const retryInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(APP_CONFIG);
  if (request.method !== 'GET' || config.httpRetryCount <= 0) {
    return next(request);
  }
  return next(request).pipe(
    retry({
      count: config.httpRetryCount,
      delay: (error: unknown, attempt: number) =>
        error instanceof HttpErrorResponse && RETRYABLE_STATUS.has(error.status)
          ? timer(config.httpRetryDelayMs * 2 ** (attempt - 1))
          : throwError(() => error),
    }),
  );
};
