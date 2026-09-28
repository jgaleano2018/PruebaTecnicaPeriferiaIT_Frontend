import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Post } from '../../../../core/models/post.models';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

/** Componente de presentación (sin dependencias de estado): recibe datos por inputs signal. */
@Component({
  selector: 'app-post-card',
  imports: [DatePipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="post" [class.post--fresh]="fresh()">
      <div class="post__avatar" [style.background]="avatarColor()" aria-hidden="true">{{ initials() }}</div>
      <div class="post__body">
        <header class="post__header">
          <strong class="post__name">{{ post().author.displayName }}</strong>
          <span class="post__username">&#64;{{ post().author.username }}</span>
          <span class="post__dot" aria-hidden="true">·</span>
          <time class="post__time" [attr.datetime]="post().publishedAt"
                [title]="post().publishedAt | date: 'medium'">{{ post().publishedAt | relativeTime: now() }}</time>
          @if (fresh()) {
            <span class="badge">Nuevo</span>
          }
        </header>
        <p class="post__message">{{ post().message }}</p>
      </div>
    </article>
  `,
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  readonly post = input.required<Post>();
  readonly fresh = input(false);
  /** Reloj compartido para refrescar los tiempos relativos sin recrear componentes. */
  readonly now = input(Date.now());

  protected readonly initials = computed(() =>
    this.post()
      .author.displayName.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join(''),
  );

  /** Color estable por usuario (hash del username). */
  protected readonly avatarColor = computed(() => {
    const hash = [...this.post().author.username].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
    return `hsl(${hash % 360} 55% 45%)`;
  });
}
