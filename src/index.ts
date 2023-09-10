#!/usr/bin/env node
import { program } from 'commander';

program.version('0.0.1');

program
  .command('generate')
  .alias('g')
  .description('generate api')
  .option('-j, --join', 'generate with join')
  .action((options: { join: boolean }) => console.log(options));

program.parse(process.argv)