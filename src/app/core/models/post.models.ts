export interface Author {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
}

/** Publicación: mensaje, usuario (autor) y fecha de publicación. */
export interface Post {
  readonly id: string;
  readonly author: Author;
  readonly message: string;
  readonly publishedAt: string;
}

/** Cuerpo de POST /api/v1/posts. La fecha la asigna el backend al guardar. */
export interface CreatePostRequest {
  readonly message: string;
}

/** Respuesta de GET /api/v1/feed */
export interface FeedPage {
  readonly items: Post[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export type FeedSocketMessage =
  | { readonly type: 'CONNECTED'; readonly data: null }
  | { readonly type: 'HEARTBEAT'; readonly data: null }
  | { readonly type: 'POST_CREATED'; readonly data: Post };

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';
