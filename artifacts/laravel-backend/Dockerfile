# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.ts tsconfig.json ./
RUN npm run build

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts --ignore-platform-req=ext-intl
COPY . .
RUN composer dump-autoload --optimize --no-interaction --ignore-platform-req=ext-intl

FROM php:8.3-cli-bookworm AS php-base
RUN apt-get update && apt-get install -y --no-install-recommends \
        libfreetype6-dev libicu-dev libjpeg62-turbo-dev libpng-dev libzip-dev unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) bcmath gd intl opcache pcntl pdo_mysql zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

FROM php-base AS app
COPY --from=vendor /app /var/www/html
COPY --from=frontend /app/public/build /var/www/html/public/build
COPY --from=frontend /app/bootstrap/ssr /var/www/html/bootstrap/ssr
RUN touch .env \
    && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache
EXPOSE 8000
CMD ["sh", "-lc", "cd public && exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"]

FROM node:22-bookworm-slim AS ssr
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=frontend /app/bootstrap/ssr ./bootstrap/ssr
EXPOSE 13714
CMD ["node", "bootstrap/ssr/ssr.js"]
