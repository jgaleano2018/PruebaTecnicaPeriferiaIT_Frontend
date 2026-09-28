import { Routes } from '@angular/router';
import { FeedStore } from '../../state/feed.store';

export const FEED_ROUTES: Routes = [
  {
    path: '',
    title: 'Publicaciones',
    // Store con alcance de ruta: se crea al entrar y se destruye al salir (cierra el WebSocket).
    providers: [FeedStore],
    loadComponent: () => import('./pages/feed-page/feed.page').then((m) => m.FeedPage),
  },
];
