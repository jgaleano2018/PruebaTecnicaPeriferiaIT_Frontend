import { ErrorHandler, inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { NotificationStore } from '../notifications/notification.store';
import { ApiError } from './api-error';

/**
 * Último recurso para errores no controlados (bugs, excepciones en plantillas…): se registran
 * y el usuario recibe un mensaje amable en lugar de una pantalla rota.
 * Los errores HTTP ya se manejan en los stores, por eso aquí no se duplican los toasts.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationStore);
  private readonly config = inject(APP_CONFIG);

  handleError(error: unknown): void {
    if (error instanceof ApiError) {
      return;
    }
    if (!this.config.production) {
      console.error('[GlobalErrorHandler]', error);
    }
    this.notifications.error('Ocurrió un error inesperado en la aplicación.');
  }
}
