import { HttpErrorResponse } from '@angular/common/http';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/**
 * Error normalizado de la aplicación. Toda falla HTTP se convierte a este tipo en el
 * errorInterceptor, de modo que componentes y stores nunca manejan HttpErrorResponse crudos.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: readonly FieldError[] = [],
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

const FRIENDLY_MESSAGES: Record<number, string> = {
  0: 'No hay conexión con el servidor. Verifique su red e intente de nuevo.',
  401: 'Su sesión no es válida o expiró. Inicie sesión nuevamente.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  429: 'Demasiadas solicitudes. Espere un momento.',
  503: 'El servicio no está disponible temporalmente. Intente en unos segundos.',
};

/** Traduce un HttpErrorResponse (incluido ProblemDetail RFC 7807 del backend) a ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError(-1, 'CLIENT_ERROR', error instanceof Error ? error.message : 'Error inesperado');
  }
  const body = isRecord(error.error) ? error.error : {};
  const code = typeof body['code'] === 'string' ? body['code'] : error.status === 0 ? 'NETWORK_ERROR' : 'HTTP_ERROR';
  const detail = typeof body['detail'] === 'string' ? body['detail'] : undefined;
  const fieldErrors = Array.isArray(body['errors']) ? (body['errors'] as FieldError[]) : [];
  const traceId = typeof body['traceId'] === 'string' ? body['traceId'] : undefined;
  const message =
    detail ?? FRIENDLY_MESSAGES[error.status] ?? (error.status >= 500
      ? 'Ocurrió un error en el servidor. Intente de nuevo más tarde.'
      : 'No fue posible completar la solicitud.');
  return new ApiError(error.status, code, message, fieldErrors, traceId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
