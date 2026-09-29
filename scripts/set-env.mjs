/**
 * Genera src/environments/environment.ts a partir de los archivos .env por ambiente.
 *
 *   node scripts/set-env.mjs development   -> lee .env.development
 *   node scripts/set-env.mjs production    -> lee .env.production
 *   node scripts/set-env.mjs mobile        -> lee .env.mobile (emulador/dispositivo Capacitor)
 *
 * Prioridad (de mayor a menor): variables de entorno del proceso (útil en Docker/CI con
 * build args) > .env.local (ajustes de su máquina, no versionado) > .env.<ambiente> > .env.
 * El archivo generado NO se versiona.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envName = process.argv[2] ?? process.env.APP_ENV ?? 'development';

const fromFile = (file) => {
  const path = resolve(root, file);
  return existsSync(path) ? dotenv.config({ path, processEnv: {}, quiet: true }).parsed ?? {} : {};
};

const envFile = `.env.${envName}`;
if (!existsSync(resolve(root, envFile))) {
  console.error(`[set-env] No existe ${envFile}. Ambientes disponibles: development, production, mobile.`);
  process.exit(1);
}

const merged = { ...fromFile('.env'), ...fromFile(envFile), ...fromFile('.env.local') };
const read = (key, fallback) => process.env[key] ?? merged[key] ?? fallback;

const required = (key) => {
  const value = read(key);
  if (!value) {
    console.error(`[set-env] Falta la variable obligatoria ${key} en ${envFile}`);
    process.exit(1);
  }
  return value;
};

const config = {
  name: envName,
  production: read('APP_PRODUCTION', 'false') === 'true',
  appName: read('APP_NAME', 'Periferia Social'),
  apiBaseUrl: required('API_BASE_URL').replace(/\/+$/, ''),
  wsBaseUrl: required('WS_BASE_URL').replace(/\/+$/, ''),
  feedPageSize: Number(read('FEED_PAGE_SIZE', '10')),
  httpRetryCount: Number(read('HTTP_RETRY_COUNT', '2')),
  httpRetryDelayMs: Number(read('HTTP_RETRY_DELAY_MS', '500')),
  wsMaxReconnectDelayMs: Number(read('WS_MAX_RECONNECT_DELAY_MS', '30000')),
  postMaxLength: Number(read('POST_MAX_LENGTH', '280')),
};

const target = resolve(root, 'src/environments/environment.ts');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(
  target,
  `// ARCHIVO GENERADO por scripts/set-env.mjs (${envFile}). No editar ni versionar.\n` +
    `import { AppConfig } from '../app/core/config/app-config';\n\n` +
    `export const environment: AppConfig = ${JSON.stringify(config, null, 2)};\n`,
);
console.log(`[set-env] environment.ts generado para "${envName}" -> API ${config.apiBaseUrl}`);
