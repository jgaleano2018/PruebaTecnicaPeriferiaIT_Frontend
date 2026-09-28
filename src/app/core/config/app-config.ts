import { InjectionToken, Provider } from '@angular/core';

/** Configuración por ambiente (generada desde los archivos .env por scripts/set-env.mjs). */
export interface AppConfig {
  readonly name: string;
  readonly production: boolean;
  readonly appName: string;
  readonly apiBaseUrl: string;
  readonly wsBaseUrl: string;
  readonly feedPageSize: number;
  readonly httpRetryCount: number;
  readonly httpRetryDelayMs: number;
  readonly wsMaxReconnectDelayMs: number;
  readonly postMaxLength: number;
}

/**
 * Los servicios dependen de este token y no del archivo environment directamente
 * (inversión de dependencias): en pruebas se inyecta una configuración controlada.
 */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export function provideAppConfig(config: AppConfig): Provider {
  return { provide: APP_CONFIG, useValue: Object.freeze({ ...config }) };
}
