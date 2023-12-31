#!/usr/bin/env node
import chalk from 'chalk';
import { program } from 'commander';
import inflection from 'inflection';
import { cloneGitHubRepository } from './create.js';
import { createComponent } from './createComponent.js';
import { fetchAllColumns, fetchPrimaryKey, fetchPrimaryKeyType } from './db.js';
import { getClassName, getTableName } from './inquirer.js';
import { updateRoutesFile } from './updateRoutesFile.js';
import { updateServicesFile } from './updateServicesFile.js';
import { updateSwaggerFile } from './updateSwaggerFile.js';
import { generateDtoSchema } from './generateDtoSchema.js';
import { generateSwagger } from './swaggerGenerator.js';

async function generateApi() {
  try {
    const { tableName, tableNameWithoutPrefix } = await getTableName();
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

    const className = await getClassName(tableNameWithoutPrefix);
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
  .command('generate')
  .alias('g')
  .description('generate api')
  .option('-j, --join', 'generate with join')
  .action(generateApi);

program
  .command('create')
  .alias('c')
  .description('create a new project')
  .action(cloneGitHubRepository);

program
  .command('swagger')
  .alias('sw')
  .description('generate swagger')
  .action(generateSwagger);

program.parse(process.argv);
