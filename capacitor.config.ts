import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor: el MISMO build de Angular se empaqueta como app iOS/Android.
 * Flujo: `npm run build:mobile` (usa .env.mobile) → `npx cap open android|ios`.
 *
 * CAP_ALLOW_MIXED_CONTENT=true permite llamar a un backend http/ws local desde el WebView
 * (https://localhost) durante el desarrollo. En producción use https/wss y déjelo en false.
 */
const allowMixedContent = (process.env['CAP_ALLOW_MIXED_CONTENT'] ?? 'true') === 'true';

const config: CapacitorConfig = {
  appId: 'com.periferia.social',
  appName: 'Periferia Social',
  webDir: 'dist/PruebaTecnicaPeriferiaIT_Frontend/browser',
  android: {
    allowMixedContent,
  },
  plugins: {
    // Las peticiones HTTP se ejecutan con el cliente nativo en iOS/Android (sin restricciones CORS del WebView).
    CapacitorHttp: { enabled: true },
  },
};

export default config;
