import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { Credentials, TokenResponse } from '../models/auth.models';

/** Cliente del auth-service (a través del API Gateway). */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiBaseUrl}/api/v1/auth`;

  /**
   * Login por GET: las credenciales viajan en la cabecera Authorization: Basic (nunca en la URL).
   * El authTokenInterceptor respeta esta cabecera y no la reemplaza por el Bearer.
   */
  login({ username, password }: Credentials): Observable<TokenResponse> {
    const basic = toBase64(`${username}:${password}`);
    return this.http.get<TokenResponse>(`${this.baseUrl}/login`, {
      headers: new HttpHeaders({ Authorization: `Basic ${basic}` }),
    });
  }
}

/** Base64 seguro para UTF-8 (claves con tildes/ñ). */
function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return btoa(String.fromCharCode(...bytes));
}
