## :gear: QUICK INSTALL:

### Requirements:

- Composer.
- PHP >= 8.1
- MySQL/MariaDB.

### With Composer:

You can create a new project running the following commands:

```bash
slim create
cd your app dir
composer start
```

#### Configure your connection to MySQL Server:

By default, the API use a MySQL Database.

You should check and edit this configuration in your `.env` file:

```
DB_HOST='127.0.0.1'
DB_NAME='yourMySqlDatabase'
DB_USER='yourMySqlUsername'
DB_PASS='yourMySqlPassword'
DB_PORT='3306'
```

## :package: DEPENDENCIES:

### LIST OF REQUIRE DEPENDENCIES:

- [slim/slim](https://github.com/slimphp/Slim): Slim is a PHP micro framework that helps you quickly write simple yet powerful web applications and APIs.
- [slim/psr7](https://github.com/slimphp/Slim-Psr7): PSR-7 implementation for use with Slim 4.
- [pimple/pimple](https://github.com/silexphp/Pimple): A small PHP dependency injection container.
- [vlucas/phpdotenv](https://github.com/vlucas/phpdotenv): Loads environment variables from `.env` to `getenv()`, `$_ENV` and `$_SERVER` automagically.

## :sunglasses: THAT'S IT!
