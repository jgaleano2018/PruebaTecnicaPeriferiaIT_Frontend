import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { TEST_CONFIG } from '../../testing/test-config';
import { provideAppConfig } from '../core/config/app-config';
import { ApiError } from '../core/errors/api-error';
import { FeedPage, Post } from '../core/models/post.models';
import { NotificationStore } from '../core/notifications/notification.store';
import { FeedApiService } from '../core/services/feed-api.service';
import { FeedRealtimeService } from '../core/services/feed-realtime.service';
import { PostsApiService } from '../core/services/posts-api.service';
import { AuthStore } from './auth.store';
import { FeedStore } from './feed.store';

const post = (id: string, username = 'bob'): Post => ({
  id,
  author: { id: `a-${username}`, username, displayName: username },
  message: `mensaje ${id}`,
  publishedAt: '2026-09-28T12:00:00Z',
});

const page = (items: Post[], nextCursor: string | null): FeedPage => ({ items, nextCursor, hasMore: !!nextCursor });

describe('FeedStore', () => {
  let feedApi: { getFeed: ReturnType<typeof vi.fn> };
  let postsApi: { create: ReturnType<typeof vi.fn> };
  let live: Subject<Post>;
  let realtime: { connect: ReturnType<typeof vi.fn>; status: ReturnType<typeof signal> };
  let notifications: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function createStore(): InstanceType<typeof FeedStore> {
    TestBed.configureTestingModule({
      providers: [
        FeedStore,
        provideAppConfig(TEST_CONFIG),
        { provide: FeedApiService, useValue: feedApi },
        { provide: PostsApiService, useValue: postsApi },
        { provide: FeedRealtimeService, useValue: realtime },
        { provide: NotificationStore, useValue: notifications },
        { provide: AuthStore, useValue: { token: signal('jwt') } },
      ],
    });
    const store = TestBed.inject(FeedStore);
    TestBed.tick();
    return store;
  }

  beforeEach(() => {
    live = new Subject<Post>();
    feedApi = { getFeed: vi.fn().mockReturnValue(of(page([post('1'), post('2')], 'cursor-2'))) };
    postsApi = { create: vi.fn() };
    realtime = { connect: vi.fn().mockReturnValue(live.asObservable()), status: signal('connected') };
    notifications = { success: vi.fn(), error: vi.fn() };
  });

  it('loads the first page on init and connects the realtime channel with the token', () => {
    const store = createStore();

    expect(feedApi.getFeed).toHaveBeenCalledWith();
    expect(store.posts().map((p) => p.id)).toEqual(['1', '2']);
    expect(store.hasMore()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(realtime.connect).toHaveBeenCalledWith('jwt');
  });

  it('appends the next page without duplicating posts', () => {
    const store = createStore();
    feedApi.getFeed.mockReturnValue(of(page([post('2'), post('3')], null)));

    store.loadMore();

    expect(feedApi.getFeed).toHaveBeenLastCalledWith('cursor-2');
    expect(store.posts().map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(store.hasMore()).toBe(false);
  });

  it('prepends realtime posts and marks them as fresh', () => {
    const store = createStore();

    live.next(post('9'));
    live.next(post('1')); // ya existe: no se duplica

    expect(store.posts().map((p) => p.id)).toEqual(['9', '1', '2']);
    expect(store.freshIds()).toContain('9');
  });

  it('publishes with an idempotency key and keeps it in recent posts', () => {
    const store = createStore();
    const created = post('10', 'alice');
    postsApi.create.mockReturnValue(of(created));

    store.publish('  hola  ');

    expect(postsApi.create).toHaveBeenCalledWith({ message: 'hola' }, expect.any(String));
    expect(store.myRecentPosts()).toEqual([created]);
    expect(store.publishedCount()).toBe(1);
    expect(store.publishing()).toBe(false);
    expect(notifications.success).toHaveBeenCalled();
  });

  it('reports publish errors without losing state', () => {
    const store = createStore();
    postsApi.create.mockReturnValue(throwError(() => new ApiError(400, 'VALIDATION_ERROR', 'Mensaje inválido')));

    store.publish('hola');

    expect(store.publishing()).toBe(false);
    expect(store.publishedCount()).toBe(0);
    expect(notifications.error).toHaveBeenCalledWith('Mensaje inválido');
  });

  it('stores the error when the feed cannot be loaded', () => {
    feedApi.getFeed.mockReturnValue(throwError(() => new ApiError(503, 'SERVICE_UNAVAILABLE', 'No disponible')));

    const store = createStore();

    expect(store.error()).toBe('No disponible');
    expect(store.posts()).toEqual([]);
    expect(store.isEmpty()).toBe(false);
  });
});
