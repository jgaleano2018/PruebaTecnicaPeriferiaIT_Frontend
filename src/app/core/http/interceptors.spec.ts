import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TEST_CONFIG } from '../../../testing/test-config';
import { AuthStore } from '../../state/auth.store';
import { provideAppConfig } from '../config/app-config';
import { ApiError } from '../errors/api-error';
import { AuthEvents } from '../services/auth-events.service';
import { httpInterceptors } from './index';

describe('HTTP interceptors', () => {
  const token = signal<string | null>('jwt-123');
  let http: HttpClient;
  let backend: HttpTestingController;
  let authEvents: AuthEvents;

  beforeEach(() => {
    token.set('jwt-123');
    TestBed.configureTestingModule({
      providers: [
        provideAppConfig(TEST_CONFIG),
        provideHttpClient(withInterceptors(httpInterceptors)),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: { token } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    authEvents = TestBed.inject(AuthEvents);
  });

  afterEach(() => backend.verify());

  it('adds Bearer token, Accept and X-Request-Id to API calls', () => {
    http.get('http://api.test/api/v1/feed').subscribe();

    const req = backend.expectOne('http://api.test/api/v1/feed');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    expect(req.request.headers.get('X-Request-Id')).toBeTruthy();
    req.flush({});
  });

  it('sets JSON Content-Type on requests with body', () => {
    http.post('http://api.test/api/v1/posts', { message: 'hola' }).subscribe();

    const req = backend.expectOne('http://api.test/api/v1/posts');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush({});
  });

  it('keeps an explicit Authorization header (Basic login)', () => {
    http.get('http://api.test/api/v1/auth/login', { headers: { Authorization: 'Basic abc' } }).subscribe();

    const req = backend.expectOne('http://api.test/api/v1/auth/login');
    expect(req.request.headers.get('Authorization')).toBe('Basic abc');
    req.flush({});
  });

  it('does not leak the token to third-party hosts', () => {
    http.get('https://other.example.com/data').subscribe();

    const req = backend.expectOne('https://other.example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-Request-Id')).toBe(false);
    req.flush({});
  });

  it('normalizes errors to ApiError and notifies session expiry on 401 of authenticated calls', async () => {
    const expired = vi.fn();
    authEvents.sessionExpired$.subscribe(expired);

    const result = firstValueFrom(http.get('http://api.test/api/v1/feed'));
    backend
      .expectOne('http://api.test/api/v1/feed')
      .flush({ code: 'UNAUTHORIZED', detail: 'Se requiere un token JWT válido' }, { status: 401, statusText: 'Unauthorized' });

    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('UNAUTHORIZED');
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('does not expire the session when the login itself returns 401', async () => {
    token.set(null);
    const expired = vi.fn();
    authEvents.sessionExpired$.subscribe(expired);

    const result = firstValueFrom(
      http.get('http://api.test/api/v1/auth/login', { headers: { Authorization: 'Basic abc' } }),
    );
    backend
      .expectOne('http://api.test/api/v1/auth/login')
      .flush({ code: 'INVALID_CREDENTIALS', detail: 'Usuario o clave incorrectos' }, { status: 401, statusText: 'Unauthorized' });

    const error = (await result.catch((e: unknown) => e)) as ApiError;
    expect(error.message).toBe('Usuario o clave incorrectos');
    expect(expired).not.toHaveBeenCalled();
  });
});
