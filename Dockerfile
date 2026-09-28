# syntax=docker/dockerfile:1.7
# ---------- Etapa 1: build de Angular ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
# Ambiente del build (lee .env.<APP_ENV>). Cualquier variable puede sobrescribirse con build args.
ARG APP_ENV=production
ARG API_BASE_URL
ARG WS_BASE_URL
ENV API_BASE_URL=${API_BASE_URL} \
    WS_BASE_URL=${WS_BASE_URL}
RUN if [ -z "$API_BASE_URL" ]; then unset API_BASE_URL; fi; \
    if [ -z "$WS_BASE_URL" ]; then unset WS_BASE_URL; fi; \
    node scripts/set-env.mjs "$APP_ENV" && npx ng build --configuration production

# ---------- Etapa 2: servidor estático ----------
FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/PruebaTecnicaPeriferiaIT_Frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://localhost/healthz || exit 1
