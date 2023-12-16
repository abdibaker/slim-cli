import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import getDataType from './helpers/getDataType.js';
import { excludedFields, updatedAtFieldArray } from './CONST.js';

dotenv.config();

export interface Column {
  [key: string]: {
    type: string;
    enum?: string[];
    format?: string;
    required?: boolean;
    exclude?: boolean;
  };
}

export const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

export const conn = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

export async function fetchPrimaryKey(tableName: string) {
  try {
    const [rows] = (await conn.query(
      `SHOW KEYS FROM \`${tableName}\` WHERE Key_name = "PRIMARY"`
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
    const [rows] = (await conn.query(`DESCRIBE \`${tableName}\``)) as any;
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
      `SHOW COLUMNS FROM \`${tableName}\``
    )) as unknown as [Column[]];

    const primaryKeyIsAutoIncrement = !!rows.find(
      (row: any) => row.Key === 'PRI' && row.Extra === 'auto_increment'
    );

    const columns = rows.reduce((acc, row: any) => {
      acc[row.Field] = {
        ...getDataType(row.Type),
        enum: row.Type.match(/'([^']+)'/g)?.map((value: string) =>
          value.replace(/'/g, '')
        ),
        format: row.Type.includes('datetime') ? 'date-time' : undefined,
        required: row.Default === null && row.Null === 'NO',
        exclude:
          row.Extra === 'auto_increment' || row.Extra === 'DEFAULT_GENERATED',
      };
      return acc;
    }, {});

    const updatedAtField = Object.entries(columns).find(
      ([key, value]) =>
        updatedAtFieldArray.includes(key) && value.format === 'date-time'
    )?.[0];

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
      .filter(key => !(columns[key]?.exclude || excludedFields.includes(key)))
      .map((key, index) => {
        const isOptional = columns[key]?.required ? '' : 'v::optional(';
        const typeValidation = columns[key]?.enum
          ? `v::in([${columns[key]?.enum
              ?.map(value => `'${value}'`)
              .join(', ')}])`
          : columns[key]?.type === 'string'
          ? 'v::stringType()'
          : 'v::intVal()';

        const validationRule = `${
          index === 0 ? 'v::' : '       ->'
        }key('${key}', ${
          isOptional
            ? `${isOptional}${typeValidation}${isOptional ? ')' : ''}`
            : `${typeValidation}`
        })`;

        return validationRule;
      })
      .join('\n');

    const updateValidationSchema = Object.keys(columns)
      .filter(key => !(columns[key]?.exclude || excludedFields.includes(key)))
      .map((key, index) => {
        const typeValidation = columns[key]?.enum
          ? `v::in([${columns[key]?.enum
              ?.map(value => `'${value}'`)
              .join(', ')}])`
          : columns[key]?.type === 'string'
          ? 'v::stringType()'
          : 'v::intVal()';

        const validationRule = `${
          index === 0 ? 'v::' : '       ->'
        }key('${key}', ${`v::optional(${typeValidation})`})`;

        return validationRule;
      })
      .join('\n');

    const filteredColumns = Object.keys(columns)
      .filter(key => !excludedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = columns[key];
        delete obj[key].exclude;
        delete obj[key].required;
        return obj;
      }, {} as { [key: string]: any });

    const insertDto = Object.assign({}, filteredColumns);
    const updateDto = Object.assign({}, filteredColumns);

    const requiredFields = Object.keys(filteredColumns)
      .filter(key => filteredColumns[key].required === true)
      .map(key => `'${key}'`)
      .join(', ');

    const phpDto = transformToPHPDto(insertDto);
    const phpUpdateDto = transformToPHPUpdateDto(updateDto, updatedAtField);

    delete updateDto[await fetchPrimaryKey(tableName)];
    delete insertDto.status;

    if (primaryKeyIsAutoIncrement) {
      delete insertDto[await fetchPrimaryKey(tableName)];
    }

    return {
      columnsToSelect,
      selectedColumns,
      columnsToInsert: JSON.stringify(insertDto, null, 2),
      phpDto,
      phpUpdateDto,
      columnsToUpdate: JSON.stringify(updateDto, null, 2),
      validationSchema,
      updateValidationSchema,
      requiredFields,
      updatedAtField,
    };
  } catch (error) {
    throw error;
  }
}

function transformToPHPDto(input: Column): string {
  return Object.entries(input)
    .map(([key, value]) => {
      if (value.format === 'date-time') {
        return `  '${key}' => $input['${key}'] ? (new \\DateTime($input['${key}']))->format('Y-m-d H:i:s') : ${
          value?.required ? "date('Y-m-d H:i:s')" : 'null'
        },`;
      } else {
        return `  '${key}' => $input['${key}'],`;
      }
    })
    .join('\n');
}

function transformToPHPUpdateDto(
  input: Column,
  updatedAtField: string | undefined
): string {
  return (
    Object.entries(input)
      .map(([key, value]) => {
        if (value.format === 'date-time') {
          return `  '${key}' => $input['${key}'] ? (new \\DateTime($input['${key}']))->format('Y-m-d H:i:s') : ($input['${key}'] ? $input['${key}'] : null),`;
        } else {
          return `  '${key}' => $input['${key}'] ?? '',`;
        }
      })
      .join('\n') +
    (updatedAtField ? `\n  '${updatedAtField}' => date('Y-m-d H:i:s'),` : '')
  );
}
