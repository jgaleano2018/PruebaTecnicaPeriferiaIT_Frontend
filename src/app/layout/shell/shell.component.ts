import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { APP_CONFIG } from '../../core/config/app-config';
import { AuthStore } from '../../state/auth.store';

/** Layout de las pantallas autenticadas: barra superior con el usuario y cierre de sesión. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar__inner">
        <span class="topbar__brand"><span class="topbar__logo" aria-hidden="true">◎</span>{{ appName }}</span>
        <div class="topbar__user">
          <span class="topbar__name">{{ auth.displayName() }}</span>
          <button type="button" class="btn btn--ghost" (click)="auth.logout()">Salir</button>
        </div>
      </div>
    </header>
    <router-outlet />
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      padding-top: env(safe-area-inset-top);
      background: color-mix(in srgb, var(--color-surface) 88%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--color-border);
    }
    .topbar__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: min(100%, 1040px);
      margin: 0 auto;
      padding: 0.75rem 1rem;
    }
    .topbar__brand { display: inline-flex; align-items: center; gap: 0.5rem; min-width: 0; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topbar__logo { color: var(--color-primary); font-size: 1.35rem; }
    .topbar__user { display: inline-flex; align-items: center; gap: 0.75rem; }
    .topbar__name { font-weight: 600; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly appName = inject(APP_CONFIG).appName;
}
