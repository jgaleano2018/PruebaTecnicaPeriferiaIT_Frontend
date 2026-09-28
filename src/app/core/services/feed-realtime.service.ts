import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { EMPTY, Observable, filter, map, repeat, retry, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { APP_CONFIG } from '../config/app-config';
import { FeedSocketMessage, Post, RealtimeStatus } from '../models/post.models';

/** Código de cierre que envía el backend cuando el token es inválido: no se reintenta. */
const POLICY_VIOLATION = 1008;

type PostCreatedMessage = Extract<FeedSocketMessage, { type: 'POST_CREATED' }>;

/**
 * Conexión WebSocket reactiva con el feed-service (a través del gateway).
 * - Reconexión automática con backoff exponencial (1s, 2s, 4s… hasta el máximo configurado),
 *   tanto si la conexión falla como si el servidor la cierra (p. ej. un redeploy).
 * - Expone el estado de la conexión como signal para la UI.
 * - El JWT viaja como query param porque el navegador no permite cabeceras en el handshake.
 */
@Injectable({ providedIn: 'root' })
export class FeedRealtimeService {
  private readonly config = inject(APP_CONFIG);
  private readonly statusSignal = signal<RealtimeStatus>('disconnected');
  private socket: WebSocketSubject<FeedSocketMessage> | null = null;
  private lastCloseCode: number | null = null;

  readonly status = this.statusSignal.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /** Flujo de publicaciones nuevas de otros usuarios. Se desconecta al cancelar la suscripción. */
  connect(token: string): Observable<Post> {
    if (!token) {
      return EMPTY;
    }
    return new Observable<FeedSocketMessage>((subscriber) => {
      this.statusSignal.set('connecting');
      this.lastCloseCode = null;
      this.socket = webSocket<FeedSocketMessage>({
        url: `${this.config.wsBaseUrl}/ws/feed?access_token=${encodeURIComponent(token)}`,
        openObserver: { next: () => this.statusSignal.set('connected') },
        closeObserver: {
          next: (event: CloseEvent) => {
            this.lastCloseCode = event.code;
            this.statusSignal.set('disconnected');
          },
        },
      });
      const subscription = this.socket.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.disconnect();
      };
    }).pipe(
      retry({ delay: (_error, attempt) => this.backoff(attempt) }),
      repeat({ delay: (attempt) => (this.lastCloseCode === POLICY_VIOLATION ? EMPTY : this.backoff(attempt)) }),
      filter((message): message is PostCreatedMessage => message.type === 'POST_CREATED'),
      map((message) => message.data),
    );
  }

  disconnect(): void {
    this.socket?.complete();
    this.socket = null;
    this.statusSignal.set('disconnected');
  }

  private backoff(attempt: number): Observable<number> {
    this.statusSignal.set('connecting');
    return timer(Math.min(1000 * 2 ** (attempt - 1), this.config.wsMaxReconnectDelayMs));
  }
}
