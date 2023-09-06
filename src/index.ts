#!/usr/bin/env node
import dotenv from 'dotenv';
import inflection from 'inflection';
import mysql from 'mysql2/promise';
import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import { PathLike } from 'fs';
import { buildApp } from './build.js';
import { copyTemplate } from './create.js';

export interface Row {
  filter(arg0: (row: Row) => boolean): unknown;
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default?: string;
  Extra: string;
}

dotenv.config();

const TEMPLATE_PATH = path.join(
  new URL('.', import.meta.url).pathname,
  'template'
);
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SRC_DIR = path.join(process.cwd(), 'src');
const ROUTES_FILE = path.join(SRC_DIR, 'App', 'Routes.php');
const SERVICES_FILE = path.join(SRC_DIR, 'App', 'Services.php');
const SWAGGER_FILE = path.join(PUBLIC_DIR, 'swagger', 'swagger.json');

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

const conn = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

async function fetchPrimaryKey(tableName: string) {
  try {
    const [rows] = (await conn.query(
      `SHOW KEYS FROM ${tableName} WHERE Key_name = "PRIMARY"`
    )) as any;
    return rows.length > 0 ? rows[0].Column_name : 'id';
  } catch (error) {
    throw error;
  }
}

async function fetchPrimaryKeyType(tableName: string, primaryKey: string) {
  try {
    const [rows] = (await conn.query(`DESCRIBE ${tableName}`)) as any;
    return rows.length > 0
      ? getDataType(rows.find((row: any) => row.Field === primaryKey).Type)
      : { type: 'integer' };
  } catch (error) {
    throw error;
  }
}

function getDataType(type: string) {
  let dataType;
  if (type.includes('int')) {
    dataType = { type: 'integer' };
  } else if (type.includes('varchar')) {
    dataType = { type: 'string' };
  } else if (type.startsWith('enum')) {
    dataType = {
      type: 'string',
      enum: type.match(/'([^']+)'/g)?.map(value => value.replace(/'/g, '')),
    };
  } else if ((type = 'double')) {
    dataType = {
      type: 'number',
    };
  } else {
    dataType = {
      type: 'string',
    };
  }
  return dataType;
}

async function fetchAllColumn(tableName: string) {
  try {
    const [rows] = (await conn.query(
      `SHOW COLUMNS FROM ${tableName}`
    )) as unknown as [Row[]];
    const result = {
      columns: rows
        .filter(
          (row: Row) =>
            row.Field !== 'createdDate' &&
            row.Field !== 'modifiedDate' &&
            row.Field !== 'createdBy' &&
            row.Field !== 'modifiedBy' &&
            row.Field !== 'deletedDate'
        )
        .map((row: Row) => {
          // Determine the data type for the field
          let dataType;
          if (row.Type.includes('int')) {
            dataType = { type: 'integer' };
          } else if (row.Type.includes('varchar')) {
            dataType = { type: 'string' };
          } else if (row.Type.startsWith('enum')) {
            dataType = {
              type: 'string',
              enum: row.Type.match(/'([^']+)'/g)?.map(value =>
                value.replace(/'/g, '')
              ),
            };
          } else if ((row.Type = 'double')) {
            dataType = {
              type: 'number',
            };
          } else {
            dataType = {
              type: 'string',
            };
          }
          return {
            [row.Field]: dataType,
          };
        }),
      insertDto: rows
        .filter(
          (row: Row) =>
            row.Extra !== 'auto_increment' &&
            row.Key !== 'PRI' &&
            row.Field !== 'createdDate' &&
            row.Field !== 'modifiedDate' &&
            row.Field !== 'modifiedBy' &&
            row.Field !== 'deletedDate'
        )
        .map((row: Row) => {
          // Determine the data type for the field
          let dataType;
          if (row.Type.includes('int')) {
            dataType = { type: 'integer' };
          } else if (row.Type.includes('varchar')) {
            dataType = { type: 'string' };
          } else if (row.Type.startsWith('enum')) {
            dataType = {
              type: 'string',
              enum: row.Type.match(/'([^']+)'/g)?.map(value =>
                value.replace(/'/g, '')
              ),
            };
          } else if ((row.Type = 'double')) {
            dataType = {
              type: 'number',
            };
          } else {
            dataType = {
              type: 'string',
            };
          }
          return {
            [row.Field]: dataType,
          };
        }),
      updateDto: rows
        .filter(
          (row: Row) =>
            row.Key !== 'PRI' &&
            row.Field !== 'createdDate' &&
            row.Field !== 'modifiedDate' &&
            row.Field !== 'createdBy' &&
            row.Field !== 'deletedDate'
        )
        .map((row: Row) => {
          // Determine the data type for the field
          let dataType;
          if (row.Type.includes('int')) {
            dataType = { type: 'integer' };
          } else if (row.Type.includes('varchar')) {
            dataType = { type: 'string' };
          } else if (row.Type.startsWith('enum')) {
            dataType = {
              type: 'string',
              enum: row.Type.match(/'([^']+)'/g)?.map(value =>
                value.replace(/'/g, '')
              ),
            };
          } else if ((row.Type = 'double')) {
            dataType = {
              type: 'number',
            };
          } else {
            dataType = {
              type: 'string',
            };
          }
          return {
            [row.Field]: dataType,
          };
        }),
    };
    const columnsToSelect = result.columns
      .map((column: {}) => Object.keys(column)[0])
      .join(', ');

    const selectedColumns = result.columns.reduce((result: any, item: any) => {
      const key = Object.keys(item)[0]; // Get the key from the current object
      if (!key) {
        return;
      }
      const value = item[key]; // Get the value object
      result[key] = value; // Assign it to the result object
      return result;
    }, {});

    const columnsToInsert = result.insertDto.reduce(
      (result: any, item: any) => {
        const key = Object.keys(item)[0];
        if (!key) {
          return;
        }
        const value = item[key];
        result[key] = value;
        return result;
      },
      {}
    );

    const columnsToUpdate = result.updateDto.reduce(
      (result: any, item: any) => {
        const key = Object.keys(item)[0];
        if (!key) {
          return;
        }
        const value = item[key];
        result[key] = value;
        return result;
      },
      {}
    );

    return {
      updateDto: result.updateDto,
      columnsToSelect,
      selectedColumns: JSON.stringify(selectedColumns, null, 2),
      columnsToInsert: JSON.stringify(columnsToInsert, null, 2),
      columnsToUpdate: JSON.stringify(columnsToUpdate, null, 2),
    };
  } catch (error) {
    throw error;
  }
}

async function generateComponents() {
  try {
    const { tableName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tableName',
        message: 'Enter the name of the Table:',
      },
    ]);
    const primaryKeyColumnName = await fetchPrimaryKey(tableName);
    const primaryKeyType = await fetchPrimaryKeyType(
      tableName,
      primaryKeyColumnName
    );
    const {
      columnsToSelect,
      selectedColumns,
      columnsToInsert,
      columnsToUpdate,
      updateDto,
    } = await fetchAllColumn(tableName);

    const prefix = /[-_]/.test(tableName) ? tableName.split(/[-_]/)[0] : '';
    const cleanedTableName = tableName.replace(new RegExp(`^${prefix}`), '');

    const { pluralNameInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'pluralName',
        message: `Enter the plural form of ${inflection.camelize(
          cleanedTableName
        )}:`,
        default: `${inflection.transform(cleanedTableName, [
          'pluralize',
          'camelize',
        ])}`,
      },
    ]);

    const pluralName = inflection.camelize(pluralNameInput);

    const pluralNameLowFirst = inflection.camelize(pluralName, true);

    const routeName = inflection.transform(pluralName, [
      'underscore',
      'dasherize',
    ]);

    for (const type of ['Controller', 'Service']) {
      const componentDir = path.join(SRC_DIR, type);
      const componentPath = path.join(
        componentDir,
        `${inflection.classify(pluralName)}${type}.php`
      );
      const templatePath = path.join(TEMPLATE_PATH, type, 'base.php');

      await fs.mkdir(componentDir, { recursive: true });

      if (await fileExists(componentPath)) {
        throw new Error(`End Point "/${pluralNameLowFirst}" already exists.`);
      } else {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const replacedContent = replaceTemplatePlaceholders(templateContent, {
          tableName,
          primaryKeyColumnName,
          primaryKeyType: primaryKeyType.type === 'integer' ? 'int' : 'string',
          pluralName,
          pluralNameLowFirst,
          columnsToSelect,
          updateDto,
        });

        await fs.writeFile(componentPath, replacedContent);
      }
    }

    const routeContentPath = path.join(TEMPLATE_PATH, 'App', 'Routes.php');
    const serviceContentPath = path.join(TEMPLATE_PATH, 'App', 'Services.php');
    const swaggerContentPath = path.join(
      TEMPLATE_PATH,
      'public',
      'swagger',
      'swagger.json'
    );

    if (!fileExists(ROUTES_FILE)) {
      throw new Error(`File "App/Routes.php" does not exist.`);
    } else {
      const existingRouteContent = await fs.readFile(ROUTES_FILE, 'utf-8');
      const routeContent = await fs.readFile(routeContentPath, 'utf-8');

      const lines = existingRouteContent.split('\n');
      const returnAppLineIndex = lines.findIndex((line: string | string[]) =>
        line.includes('return $app;')
      );

      const beforeReturnApp = lines.slice(0, returnAppLineIndex).join('\n');
      const afterReturnApp = lines.slice(returnAppLineIndex).join('\n');

      const newContent = replaceTemplatePlaceholders(routeContent, {
        pluralNameLowFirst,
        pluralName,
        routeName,
        primaryKeyColumnName,
      });
      const updatedContent =
        beforeReturnApp + '\n\n' + newContent + '\n\n' + afterReturnApp;

      await fs.writeFile(ROUTES_FILE, updatedContent);
    }

    if (!fileExists(SERVICES_FILE)) {
      throw new Error(`File "App/Services.php" does not exist.`);
    } else {
      const existingServiceContent = await fs.readFile(SERVICES_FILE, 'utf-8');
      const ServiceContent = await fs.readFile(serviceContentPath, 'utf-8');

      const newContent = replaceTemplatePlaceholders(ServiceContent, {
        pluralNameLowFirst,
        pluralName,
        primaryKeyColumnName,
      });
      const updatedContent = existingServiceContent + '\n\n' + newContent;

      await fs.writeFile(SERVICES_FILE, updatedContent);
    }

    if (!fileExists(SWAGGER_FILE)) {
      throw new Error(`File "public/swagger/swagger.json" does not exist.`);
    } else {
      const existingSwaggerContent = await fs.readFile(SWAGGER_FILE, 'utf-8');
      const swaggerContent = await fs.readFile(swaggerContentPath, 'utf-8');

      const newContent = replaceTemplatePlaceholders(swaggerContent, {
        pluralNameLowFirst,
        pluralName,
        routeName,
        primaryKeyColumnName,
        primaryKeyType: JSON.stringify(primaryKeyType),
        selectedColumns,
        columnsToInsert,
        columnsToUpdate,
      });

      const existingContentLines = existingSwaggerContent.split('\n');
      const insertIndex = existingContentLines.length - 3;
      existingContentLines.splice(insertIndex, 0, newContent);
      const updatedContent = existingContentLines.join('\n');
      await fs.writeFile(SWAGGER_FILE, updatedContent);
    }

    console.log(`End Point "/${pluralNameLowFirst}" generated successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('An error occurred:', (error as Error).message);
    process.exit(1);
  }
}

async function fileExists(filePath: PathLike) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

function replaceTemplatePlaceholders(
  content: any,
  replacements: { [s: string]: unknown } | ArrayLike<unknown>
) {
  return Object.entries(replacements).reduce(
    (result, [placeholder, replacement]) => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      return result.replace(regex, replacement);
    },
    content
  );
}

async function main() {
  try {
    program
      .version('1.0.0')
      .command('generate')
      .description('Generate components interactively')
      .action(generateComponents);

    program
      .command('build')
      .description('Build the application')
      .action(buildApp);

    program
      .command('create')
      .description('Create the application')
      .action(copyTemplate);

    program.parse(process.argv);
  } catch (error) {
    console.error('An error occurred:', (error as Error).message);
  }
}

main();
