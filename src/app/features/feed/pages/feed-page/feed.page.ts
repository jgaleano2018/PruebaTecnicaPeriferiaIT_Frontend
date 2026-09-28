import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { APP_CONFIG } from '../../../../core/config/app-config';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import { FeedStore } from '../../../../state/feed.store';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';

/** Contenedor (smart component): conecta el FeedStore con los componentes de presentación. */
@Component({
  selector: 'app-feed-page',
  imports: [PostCardComponent, PostComposerComponent, InfiniteScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feed.page.html',
  styleUrl: './feed.page.scss',
})
export class FeedPage {
  protected readonly store = inject(FeedStore);
  protected readonly maxLength = inject(APP_CONFIG).postMaxLength;

  /** Reloj reactivo (cada 30 s) para tiempos relativos y la fecha por defecto del formulario. */
  protected readonly now = toSignal(interval(30_000).pipe(map(() => Date.now())), { initialValue: Date.now() });

  private readonly freshIds = computed(() => new Set(this.store.freshIds()));

  protected readonly realtimeLabel = computed(() => {
    switch (this.store.realtimeStatus()) {
      case 'connected':
        return 'En vivo';
      case 'connecting':
        return 'Conectando…';
      default:
        return 'Sin conexión en vivo';
    }
  });

  protected isFresh(id: string): boolean {
    return this.freshIds().has(id);
  }

  protected publish(message: string): void {
    this.store.publish(message);
  }

  protected retry(): void {
    this.store.loadFeed();
  }

  protected loadMore(): void {
    this.store.loadMore();
  }
}
