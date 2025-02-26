#!/usr/bin/env node
import chalk from 'chalk';
import { program } from 'commander';
import inflection from 'inflection';
import { cloneGitHubRepository } from './create.js';
import { createComponent } from './createComponent.js';
import { fetchAllColumns, fetchPrimaryKey, fetchPrimaryKeyType } from './db.js';
import { kebabCaseClassName } from './helpers/kebabCaseClassName.js';
import { getClassName, getTableName } from './inquirer.js';
import { generateSwagger } from './swaggerGenerator.js';
import { updateRoutesFile } from './updateRoutesFile.js';
import { updateServicesFile } from './updateServicesFile.js';
import startServer from './startServer.js';

async function generateApi(tableNameArq: string | undefined) {
  try {
    const { tableName, tableNameWithoutPrefix, hasPrefix } = await getTableName(
      tableNameArq
    );

    const primaryKey = await fetchPrimaryKey(tableName);

    const primaryKeyType = await fetchPrimaryKeyType(tableName, primaryKey);
    const { columnsToSelect, phpDto, phpUpdateDto } = await fetchAllColumns(
      tableName
    );

    const className = !hasPrefix
      ? `${inflection.classify(tableName)}`
      : await getClassName(tableNameWithoutPrefix);

    const classNameLowFirst = inflection.camelize(className, true);

    const routeName = kebabCaseClassName(tableNameWithoutPrefix);

    await createComponent('Controller', {
      className,
      tableName,
      primaryKey,
      primaryKeyType: primaryKeyType.type === 'integer' ? 'int' : 'string',
      classNameLowFirst,
      phpDto,
      phpUpdateDto,
    });

    await createComponent('Service', {
      className,
      primaryKey,
      columnsToSelect,
      tableName,
      primaryKeyType: primaryKeyType.type === 'integer' ? 'int' : 'string',
    });

    await updateRoutesFile({
      classNameLowFirst,
      className,
      routeName,
      primaryKey,
    });

    await updateServicesFile({ classNameLowFirst, className, primaryKey });

    console.log(
      chalk.bgGreen(`Endpoint "/${routeName}" generated successfully!`)
    );

    await generateSwagger();

    process.exit(0);
  } catch (error) {
    console.error('An error occurred:', (error as Error).message);
    process.exit(1);
  }
}

program.version('0.0.1');

program
  .command('generate [tableName]')
  .alias('g')
  .description('generate api')
  .action(tableName => generateApi(tableName));

program
  .command('create')
  .alias('c')
  .description('create a new project')
  .argument('<projectName>', 'project name')
  .action(projectName => cloneGitHubRepository(projectName));

program
  .command('swagger')
  .alias('sw')
  .description('generate swagger')
  .action(generateSwagger);

program.command('start').description('start server').action(startServer);

program.parse(process.argv);
