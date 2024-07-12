#!/usr/bin/env node
import { program } from 'commander';
import { cloneGitHubRepository } from './create.js';
import { generateApi } from './generateApi.js';
import { generateSwagger } from './swaggerGenerator.js';

program.version('0.0.1');

program
  .command('generate [tableName]')
  .alias('g')
  .description('generate api')
  .option('-j, --join', 'generate with join')
  .action(async tableName => {
    try {
      const result = await generateApi(tableName);
      if (result.success) {
        console.log(`API generated successfully for /${result.routeName}`);
      }
    } catch (error) {
      console.error('Failed to generate API:', error);
    }
  });

program
  .command('create')
  .alias('c')
  .description('create a new project')
  .argument('<projectName>', 'project name')
  .action(async projectName => {
    try {
      await cloneGitHubRepository(projectName);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  });

program
  .command('swagger')
  .alias('sw')
  .description('generate swagger')
  .action(() => {
    console.log('Executing swagger command');
    generateSwagger();
  });

program.parse(process.argv);
