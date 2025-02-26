#!/usr/bin/env node
import { program } from 'commander';
import { cloneGitHubRepository } from './create.js';
import { generateApi } from './generateApi.js';
import { generateSwagger } from './swaggerGenerator.js';
import startServer from './startServer.js';
import chalk from 'chalk';

// Set version from package.json
program.version('0.4.0-beta', '-v, --version', 'output the current version');

program
  .command('generate [tableName]')
  .alias('g')
  .description('Generate API endpoints for a database table')
  .action(async tableName => {
    try {
      const result = await generateApi(tableName);
      if (result?.success) {
        console.log(
          chalk.green(`API generated successfully for /${result.routeName}`)
        );
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to generate API: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      process.exit(1);
    }
  });

program
  .command('create')
  .alias('c')
  .description('Create a new Slim Framework project')
  .argument('<projectName>', 'Name of the project to create')
  .action(async projectName => {
    try {
      await cloneGitHubRepository(projectName);
    } catch (error) {
      console.error(
        chalk.red(
          `Error creating project: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      process.exit(1);
    }
  });

program
  .command('swagger')
  .alias('sw')
  .description('Generate Swagger/OpenAPI documentation')
  .action(async () => {
    try {
      console.log('Generating Swagger documentation...');
      await generateSwagger();
      console.log(chalk.green('Swagger documentation generated successfully!'));
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to generate Swagger: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start development server')
  .action(async () => {
    try {
      await startServer();
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to start server: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
      process.exit(1);
    }
  });

// Add a default command when no command is specified
program.addHelpText(
  'afterAll',
  `
Examples:
  $ slim create my-project     Create a new Slim project named 'my-project' (alias: c)
  $ slim generate users        Generate API for the 'users' table (alias: g)
  $ slim swagger               Generate Swagger documentation (alias: sw)
  $ slim start                 Start the development server
`
);

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(
    `See ${chalk.cyan('slim --help')} for a list of available commands.`
  );
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length === 2) {
  program.help();
}
