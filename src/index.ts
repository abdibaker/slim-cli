#!/usr/bin/env node
import { program } from 'commander';
import { columnsToInsert } from './db.js';

program.version('0.0.1');

program
  .command('generate')
  .alias('g')
  .description('generate api')
  .option('-j, --join', 'generate with join')
  .action((options: { join: boolean }) => console.log(columnsToInsert));

program.parse(process.argv);
