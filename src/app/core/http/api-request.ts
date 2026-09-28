import { HttpRequest } from '@angular/common/http';
import { AppConfig } from '../config/app-config';

/** Solo se decoran las peticiones dirigidas a nuestro API Gateway (nunca a terceros). */
export function isApiRequest(request: HttpRequest<unknown>, config: AppConfig): boolean {
  return request.url.startsWith(config.apiBaseUrl);
}

export function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
