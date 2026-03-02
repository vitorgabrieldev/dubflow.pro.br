FROM php:8.1-apache

ENV NODE_VERSION v16.20.2

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Get latest Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

RUN a2enmod rewrite

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql
RUN docker-php-ext-install gd
RUN docker-php-ext-install zip
RUN docker-php-ext-install mbstring
RUN docker-php-ext-install exif
RUN docker-php-ext-install pcntl
RUN docker-php-ext-install bcmath

RUN mkdir -p /usr/local/nvm
ENV NVM_DIR /usr/local/nvm
# IMPORTANT: set the exact version
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# add node and npm to the PATH
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
ENV PATH $NODE_PATH:$PATH
RUN npm -v
RUN node -v
RUN npm install --global yarn
RUN yarn -v

WORKDIR /var/www/html