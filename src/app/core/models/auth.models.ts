export interface Credentials {
  readonly username: string;
  readonly password: string;
}

export interface User {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
}

/** Respuesta de GET /api/v1/auth/login */
export interface TokenResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresAt: string;
  readonly user: User;
}

/** Sesión persistida en el dispositivo. */
export interface Session {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly user: User;
}
