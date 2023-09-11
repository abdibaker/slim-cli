#!/usr/bin/env node
import { program } from 'commander';
import { fetchAllColumns, fetchPrimaryKey, fetchPrimaryKeyType } from './db.js';
import { createComponent } from './createComponent.js';
import { getClassName, getTableName } from './inquirer.js';
import inflection from 'inflection';

async function generateApi() {
  try {
    const { tableName, tableNameWithoutPrefix } = await getTableName();
    const primaryKey = await fetchPrimaryKey(tableName);
    console.log("🚀 ~ file: index.ts:12 ~ generateApi ~ primaryKey:", primaryKey)

    const primaryKeyType = await fetchPrimaryKeyType(tableName, primaryKey);
    const {
      columnsToSelect,
      selectedColumns,
      columnsToInsert,
      columnsToUpdate,
    } = await fetchAllColumns(tableName);

    const className = await getClassName(tableNameWithoutPrefix);
    const classNameLowFirst = inflection.camelize(className, true);
    const routeName = inflection.transform(className, [
      'underscore',
      'dasherize',
    ]);

    await createComponent('Controller', {
      className,
      tableName,
      primaryKey,
      primaryKeyType,
      classNameLowFirst,
      columnsToSelect,
    });

    // await createComponent(
    //   'Service',
    //   className,
    //   classNameLowFirst,
    //   routeName,
    //   primaryKeyColumnName
    // );

    // await updateRoutesFile(
    //   classNameLowFirst,
    //   className,
    //   routeName,
    //   primaryKeyColumnName
    // );
    // await updateServicesFile(
    //   classNameLowFirst,
    //   className,
    //   primaryKeyColumnName
    // );
    // await updateSwaggerFile(
    //   className,
    //   routeName,
    //   primaryKeyColumnName,
    //   primaryKeyType,
    //   selectedColumns,
    //   columnsToInsert,
    //   columnsToUpdate
    // );

    console.log(`Endpoint "/${routeName}" generated successfully!`);
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

program.parse(process.argv);

// await createComponent('Controller', className, classNameLowFirst, routeName, primaryKeyColumnName, primaryKeyType, columnsToSelect, updateDto);
// await createComponent('Service', className, classNameLowFirst, routeName, primaryKeyColumnName);
