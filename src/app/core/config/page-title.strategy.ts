import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { APP_CONFIG } from './app-config';

/** Título del documento: "<página> · <nombre de la app>". */
@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly appName = inject(APP_CONFIG).appName;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${this.appName}` : this.appName);
  }
}
