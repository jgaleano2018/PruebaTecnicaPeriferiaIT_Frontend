import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    title: 'Iniciar sesión',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
];
