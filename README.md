# Red Social — Frontend (Angular 21 + Capacitor)

Aplicación web y móvil de la red social: inicio de sesión, listado en tiempo real de las publicaciones de los demás usuarios y creación de publicaciones.
Un único código Angular se ejecuta en el navegador y se empaqueta como app **Android/iOS con Capacitor**.

> Backend (microservicios Spring Boot): [PruebaTecnicaPeriferiaIT_Backend](https://github.com/jgaleano2018/PruebaTecnicaPeriferiaIT_Backend)

| Stack | Versión |
|---|---|
| Angular (standalone, **zoneless**, signals, control flow `@if/@for`) | 21 |
| Estado: **NgRx SignalStore** (`@ngrx/signals`, entities, `rxMethod`) | 21 |
| RxJS | 7.8 |
| Capacitor (Android / iOS, Preferences, CapacitorHttp) | 8 |
| Pruebas: Vitest + jsdom (builder `@angular/build:unit-test`) | 4 |

---

## 1. Requisitos

- Node.js **22 LTS** (o 20.19+) y npm 10+
- Backend levantado (por defecto el API Gateway en `http://localhost:8080`)
- Opcional: Docker (para servir el build con Nginx), Android Studio / Xcode (para apps móviles)

## 2. Instalación y arranque

```bash
npm ci            # instala exactamente las versiones del package-lock.json
npm start         # genera el environment desde .env.development y abre http://localhost:4200
```

Credenciales de prueba (creadas por el seeder del backend): **alice**, **bob**, **carol**, **david** — clave `Password123*`.

| Script | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con `.env.development` |
| `npm run build` | Build de producción con `.env.production` → `dist/` |
| `npm run build:dev` | Build sin optimizar con `.env.development` |
| `npm test` / `npm run test:ci` | Pruebas unitarias (modo watch / una sola corrida) |
| `npm run build:mobile` | Build con `.env.mobile` + `npx cap sync` |
| `npm run cap:android` / `npm run cap:ios` | Abre el proyecto nativo en Android Studio / Xcode |

> Si `npm install` falla con `Cannot read properties of null (reading 'edgesOut')` (bug de npm 10 con dependencias opcionales de jsdom), use `npm ci` o `npx npm@11 install`.

## 3. Variables de entorno por ambiente

Angular no lee `.env` de forma nativa, así que `scripts/set-env.mjs` genera `src/environments/environment.ts` (no versionado) antes de `start`, `build` y `test`:

| Archivo | Uso |
|---|---|
| `.env.development` | Desarrollo local (`npm start`, `npm test`) |
| `.env.production` | Build productivo / Docker |
| `.env.mobile` | Capacitor (emulador Android: `10.0.2.2`; dispositivo físico: IP LAN del equipo) |
| `.env.example` | Plantilla documentada de todas las variables |
| `.env.local` (opcional, no versionado) | Ajustes de su máquina; sobrescribe al ambiente (p. ej. otro puerto del gateway) |
| `.env` (opcional, no versionado) | Valores locales compartidos |

Prioridad: **variables del proceso** (p. ej. build args de Docker/CI) > `.env.local` > `.env.<ambiente>` > `.env`.

| Variable | Descripción |
|---|---|
| `API_BASE_URL` | URL del API Gateway (obligatoria) |
| `WS_BASE_URL` | URL WebSocket del gateway, `ws://` o `wss://` (obligatoria) |
| `APP_NAME`, `APP_PRODUCTION` | Nombre visible y modo producción |
| `FEED_PAGE_SIZE` | Publicaciones por página |
| `HTTP_RETRY_COUNT`, `HTTP_RETRY_DELAY_MS` | Reintentos con backoff de peticiones GET |
| `WS_MAX_RECONNECT_DELAY_MS` | Espera máxima entre reconexiones del WebSocket |
| `POST_MAX_LENGTH` | Longitud máxima del mensaje (igual que el backend) |

La configuración llega a la app mediante el token de inyección `APP_CONFIG`; ningún servicio importa el archivo `environment` directamente, lo que facilita las pruebas.

## 4. Docker

```bash
docker compose up -d --build                       # http://localhost:4200 (usa .env.production)
API_BASE_URL=https://api.midominio.com WS_BASE_URL=wss://api.midominio.com docker compose up -d --build
```

Build multi-etapa: Node 22 compila Angular y **Nginx** sirve los estáticos con fallback de SPA, caché inmutable para archivos con hash, gzip, cabeceras de seguridad y `/healthz`. Primero levante el backend (`docker compose up -d` en su repositorio); el navegador llama directamente al gateway.

## 5. App móvil (Capacitor)

```bash
npm run build:mobile      # build con .env.mobile + sincroniza android/ e ios/
npm run cap:android       # Android Studio → Run
npm run cap:ios           # Xcode (macOS) → Run
```

- La sesión se guarda con **Capacitor Preferences** (almacenamiento nativo; en web usa `localStorage`).
- **CapacitorHttp** ejecuta las peticiones HTTP con el cliente nativo en iOS/Android.
- Solo en builds *debug* de Android se permite HTTP en claro (`android/app/src/debug/AndroidManifest.xml`) para hablar con el backend local; en producción use `https`/`wss`.
- El gateway ya admite los orígenes de Capacitor (`capacitor://localhost`, `https://localhost`) en CORS.

---

## 6. Arquitectura del frontend

```
src/app
├── core/                       # Singletons transversales (sin UI)
│   ├── config/                 # APP_CONFIG (token de configuración), TitleStrategy
│   ├── models/                 # Contratos tipados con el backend
│   ├── services/               # Servicios HTTP/WebSocket: AuthApi, PostsApi, FeedApi, FeedRealtime, AuthEvents
│   ├── http/                   # Interceptores funcionales
│   ├── errors/                 # ApiError, mapeo de ProblemDetail, GlobalErrorHandler
│   ├── guards/                 # authGuard / guestGuard (canMatch)
│   ├── storage/                # Persistencia de sesión (Capacitor Preferences)
│   └── notifications/          # NotificationStore (toasts)
├── state/                      # NgRx SignalStores: AuthStore (global), FeedStore (por ruta)
├── features/                   # Pantallas cargadas de forma diferida
│   ├── auth/login/             # Pantalla de Login
│   └── feed/                   # Pantalla de Publicaciones + componentes post-card y post-composer
├── layout/shell/               # Barra superior de las vistas autenticadas
└── shared/                     # Pipe relativeTime, directiva de scroll infinito, toasts
```

### Integración con el backend

| Componente / store | Servicio | Endpoint (vía API Gateway) |
|---|---|---|
| Login → `AuthStore.login` | `AuthApiService.login` | `GET /api/v1/auth/login` con `Authorization: Basic` |
| Publicaciones → `FeedStore.loadFeed/loadMore` | `FeedApiService.getFeed` | `GET /api/v1/feed?size=&cursor=` |
| Crear publicación → `FeedStore.publish` | `PostsApiService.create` | `POST /api/v1/posts` + `Idempotency-Key` |
| Tiempo real → `FeedStore.connectRealtime` | `FeedRealtimeService.connect` | `WS /ws/feed?access_token=<JWT>` |

### Gestión de estado (Signals + NgRx SignalStore)

- **AuthStore** (`providedIn: 'root'`): usuario, token, expiración y estado de la petición. `login` es un `rxMethod` con `exhaustMap` (ignora dobles clics). La sesión se restaura en el arranque con `provideAppInitializer`, se cierra sola al vencer el token y ante cualquier 401.
- **FeedStore** (proveído en la ruta del feed): usa `withEntities` para indexar publicaciones por id, de modo que las que llegan por WebSocket se anteponen (`prependEntity`) y las páginas se agregan (`addEntities`) **sin duplicados**. `loadFeed` usa `switchMap`, `loadMore` `exhaustMap`, `publish` `exhaustMap`. Al salir de la pantalla el store se destruye y se cierra el WebSocket.
- Los componentes de presentación (`post-card`, `post-composer`) solo reciben `input()` signals y emiten `output()`; los contenedores (`FeedPage`, `LoginPage`) conectan con los stores.

### Programación reactiva

- Plantillas 100 % basadas en signals (`store.posts()`, `canSubmit()`…) con `@if` / `@for` y `ChangeDetectionStrategy.OnPush`, en una app **zoneless**.
- Formularios reactivos convertidos a signals con `toSignal` (contador de caracteres, validez del formulario).
- Reloj reactivo (`interval` → `toSignal`) que refresca los tiempos relativos y la fecha de publicación por defecto.
- WebSocket con `rxjs/webSocket`, reconexión con backoff exponencial (`retry`/`repeat`) y estado de conexión como signal ("En vivo").
- Scroll infinito con `IntersectionObserver`.

### Interceptores HTTP (orden de la cadena)

1. **apiHeadersInterceptor** – `Accept`, `Content-Type` y `X-Request-Id` (correlación con las trazas del backend).
2. **authTokenInterceptor** – agrega `Authorization: Bearer <JWT>` solo a llamadas al API propio y respeta el `Basic` del login.
3. **errorInterceptor** – convierte cualquier error en `ApiError` (lee el ProblemDetail RFC 7807 del backend: `code`, `detail`, `errors`, `traceId`) y ante un 401 notifica el cierre de sesión.
4. **retryInterceptor** – reintenta con backoff exponencial **solo GET** ante errores de red/502/503/504.

### Manejo de errores

- Mensajes del backend mostrados tal cual (ya vienen en español y sin detalles internos); mensajes amigables para errores de red, 401, 403, 404, 503 y 5xx.
- Errores de carga del feed con estado vacío y botón *Reintentar*; errores de publicación como toast sin perder el texto escrito.
- **Publicación idempotente**: cada intento genera una `Idempotency-Key` que se reutiliza en los reintentos automáticos, por lo que un corte de red nunca duplica el mensaje.
- `GlobalErrorHandler` para excepciones no controladas.

### Rutas y carga diferida

`/login` y `/feed` se cargan con `loadChildren`/`loadComponent` (chunks separados) protegidas con guards `canMatch` (el código de una ruta no permitida ni siquiera se descarga). Precarga con `PreloadAllModules` tras el arranque.

## 7. Pruebas

```bash
npm run test:ci
```

| Archivo | Cubre |
|---|---|
| `core/http/interceptors.spec.ts` | Token Bearer, cabeceras, no filtrar el token a terceros, normalización de errores, cierre de sesión ante 401 |
| `core/http/retry.interceptor.spec.ts` | Reintento de GET ante 503; sin reintentos para 4xx ni POST |
| `core/errors/api-error.spec.ts` | Mapeo de ProblemDetail y errores de red |
| `state/auth.store.spec.ts` | Login exitoso/fallido, persistencia, restauración y expiración de sesión |
| `state/feed.store.spec.ts` | Carga inicial, paginación sin duplicados, tiempo real, publicación idempotente, errores |
| `features/feed/.../post-composer.component.spec.ts` | Contador, límite de caracteres, envío y reinicio del formulario |
| `shared/pipes/relative-time.pipe.spec.ts` | Formato de tiempos relativos en español |
