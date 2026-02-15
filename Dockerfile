FROM composer:2.7 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader


FROM php:8.3-cli-bookworm

ENV APP_DIR=/var/www/app
ENV PORT=8000

WORKDIR ${APP_DIR}

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    libicu-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libfreetype6-dev \
    libzip-dev \
    libpq-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
      bcmath \
      exif \
      gd \
      intl \
      pcntl \
      pdo \
      pdo_mysql \
      pdo_pgsql \
      zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=vendor /app/vendor ${APP_DIR}/vendor
COPY . ${APP_DIR}

RUN mkdir -p storage/framework/{cache,sessions,views} bootstrap/cache \
    && php artisan package:discover --ansi || true \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x ${APP_DIR}/docker/entrypoint.sh

USER www-data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/up" || exit 1

ENTRYPOINT ["docker/entrypoint.sh"]
