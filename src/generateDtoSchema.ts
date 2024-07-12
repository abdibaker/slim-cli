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
    workingOnFunction
      ?.split('$dto')[1]
      ?.split('];')[0]
      ?.concat(']')
      .replace(/=/g, '')
      .split('$input')
      .join('')
      .replace(/\]/g, '')
      .split(',')
      .forEach(v => {
        const row = v.replace(/\[/g, '')?.split('>');
        if (!(row[1]?.trim().startsWith("'") || row[1]?.trim().startsWith('"')))
          return;
        const key = row[0]?.trim();
        if (key) columns.push(key);
      });
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
        AND column_name = ANY(?)
        `,
        [DB_NAME, columnsInObject]
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
