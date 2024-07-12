import chalk from 'chalk';
import inflection from 'inflection';
import { createComponent } from './createComponent.js';
import { fetchAllColumns, fetchPrimaryKey, fetchPrimaryKeyType } from './db.js';
import { kebabCaseClassName } from './helpers/kebabCaseClassName.js';
import { getClassName, getTableName } from './inquirer.js';
import { generateSwagger } from './swaggerGenerator.js';
import { updateRoutesFile } from './updateRoutesFile.js';
import { updateServicesFile } from './updateServicesFile.js';

export async function generateApi(tableNameArg: string | undefined) {
  try {
    const { tableName, tableNameWithoutPrefix, hasPrefix } = await getTableName(
      tableNameArg
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

    await generateComponents(
      className,
      tableName,
      primaryKey,
      primaryKeyType,
      classNameLowFirst,
      phpDto,
      phpUpdateDto,
      columnsToSelect
    );
    await updateFiles(classNameLowFirst, className, routeName, primaryKey);

    console.log(
      chalk.bgGreen(`Endpoint "/${routeName}" generated successfully!`)
    );

    await generateSwagger();

    return { success: true, routeName };
  } catch (error) {
    console.error('An error occurred:', (error as Error).message);
    throw error;
  }
}

async function generateComponents(
  className: string,
  tableName: string,
  primaryKey: string,
  primaryKeyType: any,
  classNameLowFirst: string,
  phpDto: string,
  phpUpdateDto: string,
  columnsToSelect: string
) {
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
}

async function updateFiles(
  classNameLowFirst: string,
  className: string,
  routeName: string,
  primaryKey: string
) {
  await updateRoutesFile({
    classNameLowFirst,
    className,
    routeName,
    primaryKey,
  });

  await updateServicesFile({ classNameLowFirst, className, primaryKey });
}
