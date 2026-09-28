import { apiHeadersInterceptor } from './api-headers.interceptor';
import { authTokenInterceptor } from './auth-token.interceptor';
import { errorInterceptor } from './error.interceptor';
import { retryInterceptor } from './retry.interceptor';

/**
 * Orden de la cadena (petición →, respuesta ←):
 * headers → token → error → retry → backend.
 * El retry queda más cerca del backend para reintentar la petición cruda y el error
 * interceptor solo normaliza el resultado final.
 */
export const httpInterceptors = [apiHeadersInterceptor, authTokenInterceptor, errorInterceptor, retryInterceptor];
