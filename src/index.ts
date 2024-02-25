#!/usr/bin/env node
import chalk from 'chalk';
import { program } from 'commander';
import inflection from 'inflection';
import { cloneGitHubRepository } from './create.js';
import { createComponent } from './createComponent.js';
import { fetchAllColumns, fetchPrimaryKey, fetchPrimaryKeyType } from './db.js';
import { getClassName, getTableName } from './inquirer.js';
import { generateSwagger } from './swaggerGenerator.js';
import { updateRoutesFile } from './updateRoutesFile.js';
import { updateServicesFile } from './updateServicesFile.js';
import { updateSwaggerFile } from './updateSwaggerFile.js';

async function generateApi(tableNameArq: string | undefined) {
  try {
    const { tableName, tableNameWithoutPrefix, hasPrefix } = await getTableName(
      tableNameArq
    );
    const primaryKey = await fetchPrimaryKey(tableName);

    const primaryKeyType = await fetchPrimaryKeyType(tableName, primaryKey);
    const {
      columnsToSelect,
      selectedColumns,
      columnsToInsert,
      columnsToUpdate,
      validationSchema,
      phpDto,
      phpUpdateDto,
      requiredFields,
      updateValidationSchema,
    } = await fetchAllColumns(tableName);

    const className = !hasPrefix
      ? `${inflection.classify(tableName)}`
      : await getClassName(tableNameWithoutPrefix);

    const classNameLowFirst = inflection.camelize(className, true);
    const kebabCaseClassName = (className: string) => {
      const words = inflection.dasherize(className).split('_');
      if (words.length > 1) {
        words[words.length - 1] = inflection.pluralize(words[-1]!);
      } else {
        words[0] = inflection.pluralize(words[0]!);
      }

      return words.join('-');
    };

    const routeName = kebabCaseClassName(tableNameWithoutPrefix);

    await createComponent('Controller', {
      className,
      tableName,
      primaryKey,
      primaryKeyType: primaryKeyType.type === 'integer' ? 'int' : 'string',
      classNameLowFirst,
      validationSchema,
      phpDto,
      phpUpdateDto,
      requiredFields,
      updateValidationSchema,
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

    await updateSwaggerFile({
      className,
      routeName,
      primaryKey,
      primaryKeyType,
      selectedColumns,
      columnsToInsert,
      columnsToUpdate,
    });

    console.log(
      chalk.bgGreen(`Endpoint "/${routeName}" generated successfully!`)
    );

    // console.log(columnsToInsert)
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
  .option('-j, --join', 'generate with join')
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

program.parse(process.argv);
