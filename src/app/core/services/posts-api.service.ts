import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { CreatePostRequest, Post } from '../models/post.models';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** Cliente del post-service (comandos). */
@Injectable({ providedIn: 'root' })
export class PostsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiBaseUrl}/api/v1/posts`;

  /**
   * Crea una publicación. La misma idempotencyKey debe reutilizarse en los reintentos del
   * mismo intento lógico: el backend garantiza que no se dupliquen.
   */
  create(request: CreatePostRequest, idempotencyKey: string): Observable<Post> {
    return this.http.post<Post>(this.baseUrl, request, {
      headers: new HttpHeaders({ [IDEMPOTENCY_KEY_HEADER]: idempotencyKey }),
    });
  }
}
