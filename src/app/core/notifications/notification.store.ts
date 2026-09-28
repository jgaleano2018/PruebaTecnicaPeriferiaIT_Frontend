import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

export type NotificationKind = 'success' | 'error' | 'info';

export interface Notification {
  readonly id: number;
  readonly kind: NotificationKind;
  readonly message: string;
}

interface NotificationState {
  readonly items: Notification[];
}

let sequence = 0;

/** Notificaciones tipo toast (estado global con NgRx SignalStore). */
export const NotificationStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationState>({ items: [] }),
  withComputed(({ items }) => ({
    hasItems: computed(() => items().length > 0),
  })),
  withMethods((store) => {
    const dismiss = (id: number): void =>
      patchState(store, (state) => ({ items: state.items.filter((n) => n.id !== id) }));
    const push = (kind: NotificationKind, message: string, durationMs = 4000): void => {
      const id = ++sequence;
      patchState(store, (state) => ({ items: [...state.items.slice(-3), { id, kind, message }] }));
      setTimeout(() => dismiss(id), durationMs);
    };
    return {
      dismiss,
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message, 6000),
      info: (message: string) => push('info', message),
    };
  }),
);
