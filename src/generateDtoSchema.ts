import path from 'path';
import { readFileSync } from 'fs';
import { SRC_DIR } from './CONST.js';
import {
  DatabaseType,
  getTypeInfo,
  MysqlType,
  PostgresType,
} from './helpers/getDataType.js';
import { getConnection } from './db.js';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  column_type?: string;
  udt_name?: string;
  is_nullable: 'NO' | 'YES';
}

const CONTROLLER_PATH = path.join(SRC_DIR, 'Controller');

export async function generateDtoSchema(
  controllerName: string,
  functionName: string
) {
  const phpCode = readFileSync(`${CONTROLLER_PATH}/${controllerName}`, 'utf8');

  const columns: string[] = extractColumnsFromCode(phpCode, functionName);

  const columnsWithType = await getColumnTypeInfo(columns);

  const schemaObject = buildSchemaObject(columnsWithType);

  return schemaObject;
}

function extractColumnsFromCode(code: string, functionName: string): string[] {
  const columns: string[] = [];
  const workingOnFunction = code
    .split('function ')
    .find(e => e.startsWith(`${functionName}`));

  if (workingOnFunction) {
    // First try to find array_filter pattern
    let dtoDef = workingOnFunction.match(
      /\$dto\s*=\s*array_filter\s*\(\s*(\[[\s\S]*?\])\s*,\s*fn\s*\(\$value\)\s*=>\s*!is_null\s*\(\$value\)\)/
    );

    // If array_filter pattern not found, try regular array pattern
    if (!dtoDef) {
      dtoDef = workingOnFunction.match(/\$dto\s*=\s*(\[[\s\S]*?\]);/);
    }

    if (dtoDef && dtoDef[1]) {
      // Extract the array content
      let arrayContent = dtoDef[1].replace(/\/\/.*$/gm, ''); // Remove inline comments

      // Process the array entries
      const arrayLines = arrayContent.split('\n');

      for (const line of arrayLines) {
        // Match array key-value pairs with either single or double quotes
        const keyMatch = line.match(/['"](.*?)['"](?:\s*=>\s*|\s*$)/);
        if (keyMatch && keyMatch[1]) {
          // Use single quotes for all column names
          columns.push(`'${keyMatch[1].replace(/'/g, '')}'`);
        }
      }
    }
  }

  return columns;
}

export async function getColumnTypeInfo(
  columns: string[]
): Promise<ColumnInfo[]> {
  if (columns.length === 0) {
    return [];
  }

  const connection = getConnection();
  const client = connection.client.config.client;
  const DB_NAME = process.env.DB_NAME;

  let columnsWithType: ColumnInfo[];

  if (client === 'mysql2') {
    columnsWithType = (
      await connection.raw(
        `
       SELECT DISTINCT COLUMN_NAME as column_name, data_type as data_type, COLUMN_TYPE as column_type
        FROM information_schema.columns
        WHERE table_schema = '${DB_NAME}'
        AND COLUMN_NAME IN (${columns.join(',')})`
      )
    )[0] as ColumnInfo[];
  } else if (client === 'pg') {
    const columnsInObject = `{ ${columns
      .map(item => item.replace(/'/g, ''))
      .join(',')} }`;
    columnsWithType = (
      await connection.raw(
        `
        SELECT DISTINCT column_name, data_type, udt_name, is_nullable
        FROM information_schema.columns
        WHERE table_catalog = ?
          AND table_schema = ?
          AND column_name = ANY(?);
        `,
        [DB_NAME, process.env.DB_SCHEMA || 'public', columnsInObject]
      )
    ).rows as ColumnInfo[];
  } else {
    throw new Error(`Unsupported database client: ${client}`);
  }

  return columnsWithType;
}

function buildSchemaObject(columnsWithType: ColumnInfo[]): object {
  const dbType = (process.env.DB_CLIENT || 'mysql') as DatabaseType;

  const schemaObject: { type: string; properties: Record<string, unknown> } = {
    type: 'object',
    properties: {},
  };

  columnsWithType.forEach(column => {
    const { column_name, data_type, column_type, udt_name } = column;
    schemaObject.properties[column_name] = getTypeInfo(
      dbType,
      data_type as MysqlType | PostgresType,
      column_type,
      udt_name
    );
  });

  return schemaObject;
}
