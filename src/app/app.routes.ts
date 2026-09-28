import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guards';

/**
 * Rutas con carga diferida (lazy loading): cada feature se descarga en su propio chunk
 * solo cuando el usuario navega a ella y cumple el guard (canMatch).
 */
export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'feed',
        loadChildren: () => import('./features/feed/feed.routes').then((m) => m.FEED_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'feed' },
    ],
  },
  { path: '**', redirectTo: '' },
];
