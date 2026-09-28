import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { FeedPage } from '../models/post.models';

/** Cliente del feed-service (consultas, lado de lectura CQRS). */
@Injectable({ providedIn: 'root' })
export class FeedApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);
  private readonly baseUrl = `${this.config.apiBaseUrl}/api/v1/feed`;

  /** Publicaciones de OTROS usuarios, más recientes primero (paginación por cursor). */
  getFeed(cursor: string | null = null, size = this.config.feedPageSize): Observable<FeedPage> {
    let params = new HttpParams().set('size', size);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<FeedPage>(this.baseUrl, { params });
  }
}
