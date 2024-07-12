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
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE?: string;
  UDT_NAME?: string;
  IS_NULLABLE: 'NO' | 'YES';
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
      SELECT DISTINCT COLUMN_NAME as column_name, DATA_TYPE as data_type, COLUMN_TYPE as column_type
      FROM information_schema.columns
      WHERE table_schema = ?
      AND COLUMN_NAME IN (${columns.map(() => '?').join(',')})
    `,
        [DB_NAME, ...columns]
      )
    )[0] as ColumnInfo[];
  } else if (client === 'pg') {
    columnsWithType = (
      await connection.raw(
        `
      SELECT DISTINCT column_name, data_type
      FROM information_schema.columns
      WHERE table_catalog = ?
      AND column_name = ANY(?)
    `,
        [DB_NAME, columns]
      )
    ).rows as ColumnInfo[];
  } else {
    throw new Error(`Unsupported database client: ${client}`);
  }

  return columnsWithType;
}

function buildSchemaObject(columnsWithType: ColumnInfo[]): object {
  const dbType = process.env.DB_CLIENT as DatabaseType;
  const schemaObject: { type: string; properties: Record<string, unknown> } = {
    type: 'object',
    properties: {},
  };

  columnsWithType.forEach(column => {
    const { COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, UDT_NAME } = column;
    schemaObject.properties[COLUMN_NAME] = getTypeInfo(
      dbType,
      DATA_TYPE as MysqlType | PostgresType,
      COLUMN_TYPE,
      UDT_NAME
    );
  });

  return schemaObject;
}
