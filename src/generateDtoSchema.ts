import path from 'path';
import { readFileSync } from 'fs';
import { SRC_DIR } from './CONST.js';
import { DB_NAME, conn } from './db.js';
import getTypeInfo, { MysqlType } from './helpers/getDataType.js';

interface ColumnInfo {
  COLUMN_NAME: string;
  DATA_TYPE: MysqlType;
  COLUMN_TYPE: string;
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
        const key = v.replace(/\[/g, '')?.split('>')[0]?.trim();
        key && columns.push(key);
      });
  }

  return columns;
}

async function getColumnTypeInfo(columns: string[]): Promise<ColumnInfo[]> {
  if (columns.length === 0) {
    return [];
  }
  const columnsWithType = (
    await conn.query(`
        SELECT DISTINCT COLUMN_NAME, data_type, COLUMN_TYPE
        FROM information_schema.columns
        WHERE table_schema = '${DB_NAME}'
        AND COLUMN_NAME IN (${columns.join(',')})`)
  )[0] as unknown as ColumnInfo[];

  return columnsWithType;
}

function buildSchemaObject(columnsWithType: ColumnInfo[]): object {
  const schemaObject: { type: string; properties: Record<string, unknown> } = {
    type: 'object',
    properties: {},
  };

  columnsWithType.forEach(column => {
    const { COLUMN_NAME, ...typeInfo } = column;
    schemaObject.properties[COLUMN_NAME] = getTypeInfo(
      typeInfo.DATA_TYPE,
      typeInfo.COLUMN_TYPE
    );
  });

  return schemaObject;
}
