## Introduction

The "@hmy-tech/slim-cli" npm package is a command-line tool designed to streamline the process of generating RESTful API for your slim 4 projects. It provides a simple and efficient way to scaffold controller, service, route, and Swagger documentation files for your database tables. With this package, you can quickly create CRUD endpoints for your tables with minimal effort.

## Installation

To use this npm package, you need to install it globally on your system. Open your terminal and run the following command:

```bash
npm install -g @hmy-tech/slim-cli
```

This will make the `@hmy-tech/slim-cli` command available globally in your terminal.

## Usage

### Creating a New Project

To create a new Slim 4 project using a predefined template, use the following command:

```bash
slim create or slim c
```

This command will clone a GitHub repository containing the project template and set up the basic structure for you.
Then set your database credentials in the .env file

### Generating API Components

To generate API for a specific database table, use the following command:

```bash
slim generate or slim g
```

You can also use the `-j` or `--join` option to generate API with join operations if your database schema includes relationships between tables.


### Generating Swagger Documentation

To generate Swagger documentation dynamically, use the following command:

```bash
slim swagger or slim sw
```

This command will generate a Swagger file that documents your API endpoints, making it easier for other developers to understand and use your API.


### Starting the Server

To start the server, use the following command:

```bash
composer start
```

## Author

This npm package, "@hmy-tech/slim-cli," was developed with love by Abdillah Bakari. You can find me on [GitHub](https://github.com/abdibaker)

## Contributions

Contributions to this project are welcome! If you encounter any issues, have ideas for improvements, or want to contribute to the codebase, please feel free to submit a pull request or open an issue on the [GitHub repository](https://github.com/abdibaker/slim-cli).

## License

This project is open-source and available under the [MIT License](LICENSE). You are free to use and modify it as needed.
