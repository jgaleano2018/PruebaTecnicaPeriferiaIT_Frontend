import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from '../../state/auth.store';

/** Solo usuarios autenticados. Se usa canMatch para que el chunk lazy ni siquiera se descargue. */
export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

/** Solo invitados (la pantalla de login redirige al feed si ya hay sesión). */
export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  return !auth.isAuthenticated() || inject(Router).createUrlTree(['/feed']);
};
