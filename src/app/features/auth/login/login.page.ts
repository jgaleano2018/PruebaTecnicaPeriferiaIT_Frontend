import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { APP_CONFIG } from '../../../core/config/app-config';
import { AuthStore } from '../../../state/auth.store';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  protected readonly auth = inject(AuthStore);
  protected readonly appName = inject(APP_CONFIG).appName;
  protected readonly showPassword = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.maxLength(100)]],
  });

  /**
   * El botón solo se bloquea mientras hay una petición en curso. No se deshabilita por
   * formulario inválido porque el autocompletado del navegador (p. ej. Chrome) llena los
   * campos sin notificar a Angular hasta la primera interacción; la validación se hace al enviar.
   */
  protected readonly canSubmit = computed(() => !this.auth.isLoading());

  constructor() {
    // Al editar, se limpia el error anterior de credenciales.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.auth.error()) {
        this.auth.clearError();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.auth.login(this.form.getRawValue());
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected hasError(control: 'username' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }
}
