import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { addEntities, prependEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, exhaustMap, filter, pipe, retry, switchMap, tap, throwError, timer } from 'rxjs';
import { ApiError } from '../core/errors/api-error';
import { FeedPage, Post } from '../core/models/post.models';
import { NotificationStore } from '../core/notifications/notification.store';
import { FeedApiService } from '../core/services/feed-api.service';
import { FeedRealtimeService } from '../core/services/feed-realtime.service';
import { PostsApiService } from '../core/services/posts-api.service';
import { newRequestId } from '../core/http/api-request';
import { AuthStore } from './auth.store';

export interface FeedState {
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly publishing: boolean;
  readonly error: string | null;
  /** Publicaciones del usuario en esta sesión (el feed solo muestra las de los demás). */
  readonly myRecentPosts: Post[];
  /** Ids recibidos en tiempo real, para resaltarlos en la UI. */
  readonly freshIds: string[];
  /** Se incrementa con cada publicación exitosa (el formulario lo usa para limpiarse). */
  readonly publishedCount: number;
}

const initialState: FeedState = {
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  publishing: false,
  error: null,
  myRecentPosts: [],
  freshIds: [],
  publishedCount: 0,
};

const PUBLISH_RETRIES = 2;
const MAX_RECENT = 5;

/**
 * Estado del feed (NgRx SignalStore + entities). Se provee a nivel de ruta: vive mientras
 * el usuario está en la pantalla del feed y al salir se cancelan peticiones y el WebSocket.
 *
 * - Carga inicial (switchMap: una recarga cancela la anterior).
 * - Paginación por cursor (exhaustMap: evita páginas duplicadas por scroll rápido).
 * - Tiempo real: las publicaciones que llegan por WebSocket se anteponen sin duplicar
 *   (las entidades se indexan por id, así que un post ya paginado no se repite).
 * - Publicar: una Idempotency-Key por intento lógico, reutilizada en los reintentos.
 */
export const FeedStore = signalStore(
  withEntities<Post>(),
  withState(initialState),
  withProps(() => ({
    /** Estado de la conexión WebSocket (signal de solo lectura). */
    realtimeStatus: inject(FeedRealtimeService).status,
  })),
  withComputed(({ entities, loading, error }) => ({
    posts: entities,
    isEmpty: computed(() => !loading() && !error() && entities().length === 0),
  })),
  withMethods(
    (
      store,
      feedApi = inject(FeedApiService),
      postsApi = inject(PostsApiService),
      realtime = inject(FeedRealtimeService),
      notifications = inject(NotificationStore),
    ) => {
      const applyPage = (page: FeedPage, append: boolean): void =>
        patchState(
          store,
          append ? addEntities(page.items) : setAllEntities(page.items),
          { nextCursor: page.nextCursor, hasMore: page.hasMore, loading: false, loadingMore: false, error: null },
        );

      const onPageError = (error: ApiError): void =>
        patchState(store, { loading: false, loadingMore: false, error: error.message });

      const createWithIdempotency = (message: string): Observable<Post> => {
        const idempotencyKey = newRequestId();
        return postsApi.create({ message }, idempotencyKey).pipe(
          retry({
            count: PUBLISH_RETRIES,
            delay: (error: ApiError, attempt) =>
              error.isNetworkError || error.status >= 502 ? timer(500 * 2 ** (attempt - 1)) : throwError(() => error),
          }),
        );
      };

      return {
        loadFeed: rxMethod<void>(
          pipe(
            tap(() => patchState(store, { loading: true, error: null })),
            switchMap(() =>
              feedApi.getFeed().pipe(tapResponse({ next: (page) => applyPage(page, false), error: onPageError })),
            ),
          ),
        ),

        loadMore: rxMethod<void>(
          pipe(
            filter(() => store.hasMore() && !store.loadingMore() && !store.loading()),
            tap(() => patchState(store, { loadingMore: true })),
            exhaustMap(() =>
              feedApi
                .getFeed(store.nextCursor())
                .pipe(tapResponse({ next: (page) => applyPage(page, true), error: onPageError })),
            ),
          ),
        ),

        publish: rxMethod<string>(
          pipe(
            filter((message) => message.trim().length > 0),
            tap(() => patchState(store, { publishing: true })),
            exhaustMap((message) =>
              createWithIdempotency(message.trim()).pipe(
                tapResponse({
                  next: (post) => {
                    patchState(store, (state) => ({
                      publishing: false,
                      publishedCount: state.publishedCount + 1,
                      myRecentPosts: [post, ...state.myRecentPosts].slice(0, MAX_RECENT),
                    }));
                    notifications.success('¡Publicación creada!');
                  },
                  error: (error: ApiError) => {
                    patchState(store, { publishing: false });
                    notifications.error(error.message);
                  },
                }),
              ),
            ),
          ),
        ),

        /** Recibe publicaciones nuevas en tiempo real mientras el store esté vivo. */
        connectRealtime: rxMethod<string | null>(
          pipe(
            switchMap((token) =>
              token
                ? realtime.connect(token).pipe(
                    catchError(() => EMPTY),
                    tap((post) =>
                      patchState(store, prependEntity(post), (state) => ({
                        freshIds: [post.id, ...state.freshIds].slice(0, 20),
                      })),
                    ),
                  )
                : EMPTY,
            ),
          ),
        ),
      };
    },
  ),
  withHooks((store) => {
    const auth = inject(AuthStore);
    return {
      onInit() {
        store.loadFeed();
        // Se reconecta automáticamente si cambia el token y se detiene al cerrar sesión.
        store.connectRealtime(auth.token);
      },
    };
  }),
);
