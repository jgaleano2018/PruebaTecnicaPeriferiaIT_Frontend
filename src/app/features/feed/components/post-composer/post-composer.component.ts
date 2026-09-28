import { ChangeDetectionStrategy, Component, computed, effect, input, output, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';

/**
 * Formulario para crear una publicación: mensaje + fecha de publicación.
 * La fecha se muestra como referencia y se asigna por defecto al guardar (en el backend).
 * Componente de presentación: emite `submitted` y el contenedor decide qué hacer.
 */
@Component({
  selector: 'app-post-composer',
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './post-composer.component.html',
  styleUrl: './post-composer.component.scss',
})
export class PostComposerComponent {
  readonly maxLength = input(280);
  readonly publishing = input(false);
  /** Cambia tras cada publicación exitosa: limpia el formulario. */
  readonly resetToken = input(0);
  /** Reloj para mostrar la fecha de publicación por defecto. */
  readonly now = input(Date.now());
  readonly submitted = output<string>();

  protected readonly message = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  protected readonly form = new FormGroup({ message: this.message });

  private readonly text = toSignal(
    this.message.valueChanges.pipe(
      startWith(this.message.value),
      map((value) => value.trim()),
    ),
    { initialValue: '' },
  );

  protected readonly length = computed(() => this.text().length);
  protected readonly remaining = computed(() => this.maxLength() - this.length());
  protected readonly overLimit = computed(() => this.remaining() < 0);
  protected readonly canPublish = computed(() => this.length() > 0 && !this.overLimit() && !this.publishing());

  constructor() {
    effect(() => {
      if (this.resetToken() > 0) {
        untracked(() => this.message.reset(''));
      }
    });
    // Mientras se publica, el control se deshabilita para evitar ediciones concurrentes.
    effect(() => (this.publishing() ? this.message.disable() : this.message.enable()));
  }

  protected submit(): void {
    if (this.canPublish()) {
      this.submitted.emit(this.text());
    }
  }
}
