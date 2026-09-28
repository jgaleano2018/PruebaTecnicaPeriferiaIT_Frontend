import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TEST_CONFIG } from '../../testing/test-config';
import { provideAppConfig } from '../core/config/app-config';
import { ApiError } from '../core/errors/api-error';
import { TokenResponse } from '../core/models/auth.models';
import { AuthApiService } from '../core/services/auth-api.service';
import { AuthEvents } from '../core/services/auth-events.service';
import { SessionStorageService } from '../core/storage/session-storage.service';
import { AuthStore, isSessionValid } from './auth.store';

describe('AuthStore', () => {
  const future = () => new Date(Date.now() + 3_600_000).toISOString();
  const tokenResponse = (): TokenResponse => ({
    accessToken: 'jwt',
    tokenType: 'Bearer',
    expiresAt: future(),
    user: { id: 'u1', username: 'alice', displayName: 'Alice' },
  });

  let api: { login: ReturnType<typeof vi.fn> };
  let storage: { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof AuthStore>;
  let router: Router;

  beforeEach(() => {
    api = { login: vi.fn() };
    storage = { load: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined), clear: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideAppConfig(TEST_CONFIG),
        { provide: AuthApiService, useValue: api },
        { provide: SessionStorageService, useValue: storage },
      ],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('starts unauthenticated', () => {
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
  });

  it('logs in, persists the session and navigates to the feed', () => {
    api.login.mockReturnValue(of(tokenResponse()));

    store.login({ username: 'alice', password: 'Password123*' });

    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('jwt');
    expect(store.displayName()).toBe('Alice');
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'jwt' }));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/feed');
  });

  it('exposes the backend error message on invalid credentials', () => {
    api.login.mockReturnValue(throwError(() => new ApiError(401, 'INVALID_CREDENTIALS', 'Usuario o clave incorrectos')));

    store.login({ username: 'alice', password: 'bad' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Usuario o clave incorrectos');
    expect(store.isAuthenticated()).toBe(false);
  });

  it('restores a valid persisted session and discards an expired one', async () => {
    storage.load.mockResolvedValueOnce({ accessToken: 'saved', expiresAt: future(), user: tokenResponse().user });
    await store.restoreSession();
    expect(store.token()).toBe('saved');

    await store.logout();
    storage.load.mockResolvedValueOnce({ accessToken: 'old', expiresAt: new Date(Date.now() - 1000).toISOString(), user: tokenResponse().user });
    await store.restoreSession();
    expect(store.token()).toBeNull();
    expect(storage.clear).toHaveBeenCalled();
  });

  it('logs out when the HTTP layer reports an expired session', async () => {
    api.login.mockReturnValue(of(tokenResponse()));
    store.login({ username: 'alice', password: 'Password123*' });

    TestBed.inject(AuthEvents).notifySessionExpired();
    await Promise.resolve();

    expect(store.isAuthenticated()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/login');
  });

  it('validates expiry with a safety margin', () => {
    const now = Date.now();
    expect(isSessionValid(new Date(now + 60_000).toISOString(), now)).toBe(true);
    expect(isSessionValid(new Date(now + 1_000).toISOString(), now)).toBe(false);
    expect(isSessionValid(null, now)).toBe(false);
  });
});
