import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import getDataType from './helpers/getDataType.js';
import { excludedFieldsArray } from './CONST.js';

dotenv.config();

export interface Column {
  [key: string]: {
    type: string;
    enum?: string[];
    required?: boolean;
    exclude?: boolean;
  };
}

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

const conn = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

export async function fetchPrimaryKey(tableName: string) {
  try {
    const [rows] = (await conn.query(
      `SHOW KEYS FROM ${tableName} WHERE Key_name = "PRIMARY"`
    )) as any;
    return rows.length > 0 ? rows[0].Column_name : 'id';
  } catch (error) {
    throw error;
  }
}

export async function fetchPrimaryKeyType(
  tableName: string,
  primaryKey: string
) {
  try {
    const [rows] = (await conn.query(`DESCRIBE ${tableName}`)) as any;
    const primaryKeyRow = rows.find((row: any) => row.Field === primaryKey);
    const primaryKeyType = primaryKeyRow
      ? getDataType(primaryKeyRow.Type)
      : { type: 'integer' };

    return primaryKeyType;
  } catch (error) {
    throw error;
  }
}

export async function fetchAllColumns(tableName: string) {
  try {
    const [rows] = (await conn.query(
      `SHOW COLUMNS FROM ${tableName}`
    )) as unknown as [Column[]];
    const excludedFields = excludedFieldsArray;

    const primaryKeyIsAutoIncrement = !!rows.find(
      (row: any) => row.Key === 'PRI' && row.Extra === 'auto_increment'
    );

    const columns = rows.reduce((acc, row: any) => {
      acc[row.Field] = {
        ...getDataType(row.Type),
        required: row.Null === 'NO',
        exclude:
          row.Extra === 'auto_increment' || row.Extra === 'DEFAULT_GENERATED',
      };
      return acc;
    }, {});

    const columnsForSelection = rows.reduce((acc, row: any) => {
      if (
        row.Extra !== 'DEFAULT_GENERATED' &&
        !excludedFields.includes(row.Field)
      ) {
        acc[row.Field] = getDataType(row.Type);
      }
      return acc;
    }, {});

    const columnsToSelect = Object.keys(columnsForSelection).join(', ');
    const selectedColumns = JSON.stringify(columnsForSelection, null, 2);
    const validationSchema = Object.keys(columns)
      .map((key, index) => {
        if (columns[key]?.exclude) return null;
        return `${index === 0 ? 'v::' : '    '}->key('${key}', v::${
          columns[key]?.type === 'string' ? 'stringType()' : 'intVal()'
        })`;
      })
      .filter(schema => schema !== null)
      .join('\n');
    const insertDto = Object.assign({}, columns);
    const updateDto = Object.assign({}, columns);

    delete updateDto[await fetchPrimaryKey(tableName)];
    delete insertDto.status;

    if (primaryKeyIsAutoIncrement) {
      delete insertDto[await fetchPrimaryKey(tableName)];
    }

    return {
      columnsToSelect,
      selectedColumns,
      columnsToInsert: JSON.stringify(insertDto, null, 2),
      columnsToUpdate: JSON.stringify(updateDto, null, 2),
      validationSchema,
    };
  } catch (error) {
    throw error;
  }
}
