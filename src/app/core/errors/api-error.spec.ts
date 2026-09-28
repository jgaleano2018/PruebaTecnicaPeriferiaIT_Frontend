import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, toApiError } from './api-error';

describe('toApiError', () => {
  it('maps a backend ProblemDetail preserving code, detail, field errors and traceId', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        code: 'VALIDATION_ERROR',
        detail: 'La petición contiene datos inválidos',
        traceId: 'abc123',
        errors: [{ field: 'message', message: 'El mensaje es obligatorio' }],
      },
    });

    const apiError = toApiError(error);

    expect(apiError).toBeInstanceOf(ApiError);
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe('VALIDATION_ERROR');
    expect(apiError.message).toBe('La petición contiene datos inválidos');
    expect(apiError.fieldErrors).toEqual([{ field: 'message', message: 'El mensaje es obligatorio' }]);
    expect(apiError.traceId).toBe('abc123');
  });

  it('uses a friendly message for network errors (status 0)', () => {
    const apiError = toApiError(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));

    expect(apiError.isNetworkError).toBe(true);
    expect(apiError.code).toBe('NETWORK_ERROR');
    expect(apiError.message).toContain('No hay conexión');
  });

  it('falls back to a generic server message for 5xx without body', () => {
    const apiError = toApiError(new HttpErrorResponse({ status: 500 }));

    expect(apiError.message).toContain('error en el servidor');
  });

  it('returns the same instance when it is already an ApiError', () => {
    const original = new ApiError(401, 'UNAUTHORIZED', 'x');

    expect(toApiError(original)).toBe(original);
  });
});
