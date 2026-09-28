import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Bus de eventos de sesión. Desacopla la capa HTTP (interceptores) del estado de
 * autenticación y evita dependencias circulares (interceptor → store → HttpClient).
 */
@Injectable({ providedIn: 'root' })
export class AuthEvents {
  private readonly sessionExpired = new Subject<void>();

  readonly sessionExpired$: Observable<void> = this.sessionExpired.asObservable();

  notifySessionExpired(): void {
    this.sessionExpired.next();
  }
}
