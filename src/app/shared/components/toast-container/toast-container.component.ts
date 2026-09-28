import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationStore } from '../../../core/notifications/notification.store';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (toast of store.items(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.kind" role="status">
          <span>{{ toast.message }}</span>
          <button type="button" class="toast__close" (click)="store.dismiss(toast.id)" aria-label="Cerrar">×</button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  protected readonly store = inject(NotificationStore);
}
