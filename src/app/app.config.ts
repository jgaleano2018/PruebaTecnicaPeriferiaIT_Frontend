import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, provideRouter, TitleStrategy, withComponentInputBinding, withPreloading } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideAppConfig } from './core/config/app-config';
import { PageTitleStrategy } from './core/config/page-title.strategy';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { httpInterceptors } from './core/http';
import { AuthStore } from './state/auth.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAppConfig(environment),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withFetch(), withInterceptors(httpInterceptors)),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Restaura la sesión persistida antes de la primera navegación (los guards ya la ven).
    provideAppInitializer(() => inject(AuthStore).restoreSession()),
  ],
};
