import { computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';
import { ApiError } from '../core/errors/api-error';
import { Credentials, Session, TokenResponse, User } from '../core/models/auth.models';
import { NotificationStore } from '../core/notifications/notification.store';
import { AuthApiService } from '../core/services/auth-api.service';
import { AuthEvents } from '../core/services/auth-events.service';
import { SessionStorageService } from '../core/storage/session-storage.service';

export type AuthStatus = 'idle' | 'loading' | 'error';

export interface AuthState {
  readonly user: User | null;
  readonly token: string | null;
  readonly expiresAt: string | null;
  readonly status: AuthStatus;
  readonly error: string | null;
}

const initialState: AuthState = { user: null, token: null, expiresAt: null, status: 'idle', error: null };

/** Margen para considerar vencido un token un poco antes de su expiración real. */
const EXPIRY_SKEW_MS = 5_000;

export function isSessionValid(expiresAt: string | null, now = Date.now()): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() - EXPIRY_SKEW_MS > now;
}

/**
 * Estado de autenticación (NgRx SignalStore).
 * - `login` es un rxMethod: exhaustMap ignora dobles envíos mientras hay uno en curso.
 * - La sesión se persiste con Capacitor Preferences y se restaura al iniciar la app.
 * - Se cierra sesión automáticamente al vencer el token o ante un 401 del backend.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ token, expiresAt, user, status }) => ({
    isAuthenticated: computed(() => !!token() && isSessionValid(expiresAt())),
    displayName: computed(() => user()?.displayName ?? ''),
    isLoading: computed(() => status() === 'loading'),
  })),
  withMethods(
    (
      store,
      api = inject(AuthApiService),
      storage = inject(SessionStorageService),
      router = inject(Router),
      notifications = inject(NotificationStore),
    ) => {
      let expiryTimer: ReturnType<typeof setTimeout> | undefined;

      const scheduleAutoLogout = (expiresAt: string, logout: () => Promise<void>): void => {
        clearTimeout(expiryTimer);
        const delay = new Date(expiresAt).getTime() - Date.now() - EXPIRY_SKEW_MS;
        // setTimeout admite como máximo ~24,8 días
        expiryTimer = setTimeout(() => void logout(), Math.max(0, Math.min(delay, 2_147_483_647)));
      };

      const applySession = (session: Session): void => {
        patchState(store, {
          user: session.user,
          token: session.accessToken,
          expiresAt: session.expiresAt,
          status: 'idle',
          error: null,
        });
      };

      const logout = async (reason?: 'expired'): Promise<void> => {
        clearTimeout(expiryTimer);
        patchState(store, initialState);
        await storage.clear();
        if (reason === 'expired') {
          notifications.info('Su sesión expiró. Inicie sesión nuevamente.');
        }
        await router.navigateByUrl('/login');
      };

      const onLoginSuccess = (response: TokenResponse): void => {
        const session: Session = { accessToken: response.accessToken, expiresAt: response.expiresAt, user: response.user };
        applySession(session);
        scheduleAutoLogout(session.expiresAt, () => logout('expired'));
        void storage.save(session);
        void router.navigateByUrl('/feed');
      };

      return {
        login: rxMethod<Credentials>(
          pipe(
            tap(() => patchState(store, { status: 'loading', error: null })),
            exhaustMap((credentials) =>
              api.login(credentials).pipe(
                tapResponse({
                  next: onLoginSuccess,
                  error: (error: ApiError) => patchState(store, { status: 'error', error: error.message }),
                }),
              ),
            ),
          ),
        ),

        logout: () => logout(),

        expireSession: () => (store.token() ? logout('expired') : Promise.resolve()),

        clearError: () => patchState(store, { error: null, status: 'idle' }),

        /** Restaura la sesión persistida (se invoca en el arranque de la app). */
        async restoreSession(): Promise<void> {
          const session = await storage.load();
          if (session && isSessionValid(session.expiresAt)) {
            applySession(session);
            scheduleAutoLogout(session.expiresAt, () => logout('expired'));
          } else if (session) {
            await storage.clear();
          }
        },
      };
    },
  ),
  withHooks((store) => {
    const authEvents = inject(AuthEvents);
    return {
      onInit() {
        // 401 detectado por el errorInterceptor → cierre de sesión centralizado
        authEvents.sessionExpired$.pipe(takeUntilDestroyed()).subscribe(() => void store.expireSession());
      },
    };
  }),
);
