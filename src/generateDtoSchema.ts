import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SRC_DIR } from './CONST.js';
import { getConnection } from './db.js';
import {
  type DatabaseType,
  type MysqlType,
  type PostgresType,
  getTypeInfo,
} from './helpers/getDataType.js';

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
    // First: match array_filter or direct array
    const dtoDef =
      workingOnFunction.match(
        /\$dto\s*=\s*array_filter\s*\(\s*(\[[\s\S]*?\])\s*,\s*fn\s*\(\$value\)\s*=>\s*!is_null\s*\(\$value\)\)/
      ) || workingOnFunction.match(/\$dto\s*=\s*(\[[\s\S]*?\]);/);

    if (dtoDef?.[1]) {
      // Remove comments
      const arrayContent = dtoDef[1].replace(/\/\/.*$/gm, '');
      const arrayLines = arrayContent.split('\n');

      for (const line of arrayLines) {
        const keyMatch = line.match(/['"](.*?)['"](?:\s*=>\s*|\s*$)/);
        if (keyMatch?.[1]) {
          columns.push(keyMatch[1]);
        }
      }
    } else {
      // Second: match filterDtoFields with inline array
      const filterFieldsMatch = workingOnFunction.match(
        /filterDtoFields\s*\(\s*\$input\s*,\s*\[\s*(['"][^'"]+['"](?:\s*,\s*['"][^'"]+['"])*?)\s*\]\s*\)/
      );

      if (filterFieldsMatch?.[1]) {
        const inlineArray = filterFieldsMatch[1];
        const fieldMatches = inlineArray.match(/['"]([^'"]+)['"]/g);
        if (fieldMatches) {
          columns.push(
            ...fieldMatches.map(field => field.replace(/['"]/g, ''))
          );
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
        AND COLUMN_NAME IN (${columns.map(item => `'${item}'`).join(',')})`
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

  for (const column of columnsWithType) {
    const { column_name, data_type, column_type, udt_name } = column;
    schemaObject.properties[column_name] = getTypeInfo(
      dbType,
      data_type as MysqlType | PostgresType,
      column_type,
      udt_name
    );
  }

  return schemaObject;
}
