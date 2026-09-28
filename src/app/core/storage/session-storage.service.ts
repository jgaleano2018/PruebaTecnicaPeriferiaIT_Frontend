import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Session } from '../models/auth.models';

const SESSION_KEY = 'periferia.session';

/**
 * Persistencia de la sesión. Usa Capacitor Preferences: en iOS/Android guarda en el
 * almacenamiento nativo (UserDefaults / SharedPreferences) y en web cae a localStorage,
 * así el mismo código sirve para ambas plataformas.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  async load(): Promise<Session | null> {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as Session;
    } catch {
      await this.clear();
      return null;
    }
  }

  save(session: Session): Promise<void> {
    return Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
  }

  clear(): Promise<void> {
    return Preferences.remove({ key: SESSION_KEY });
  }
}
