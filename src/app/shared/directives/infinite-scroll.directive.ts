import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * Emite `reached` cuando el elemento centinela entra en pantalla (IntersectionObserver).
 * Permite scroll infinito sin listeners de scroll ni cálculos de posición.
 */
@Directive({ selector: '[appInfiniteScroll]' })
export class InfiniteScrollDirective {
  readonly rootMargin = input('200px');
  readonly reached = output<void>();

  constructor() {
    const element = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => entries.some((e) => e.isIntersecting) && this.reached.emit(),
        { rootMargin: this.rootMargin() },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
