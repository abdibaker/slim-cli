import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import getDataType from './helpers/getDataType.js';
import { excludedFields } from './CONST.js';

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

    const filteredColumns = Object.keys(columns)
      .filter(key => !excludedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = columns[key];
        delete obj[key].exclude;
        return obj;
      }, {} as { [key: string]: any });

    const insertDto = Object.assign({}, filteredColumns);
    const updateDto = Object.assign({}, filteredColumns);
    const requiredFields = Object.keys(filteredColumns).filter(key => filteredColumns[key].required === true);;
    
    const phpDto = transformToPHPDto(insertDto);

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
      columnsToUpdate: JSON.stringify(updateDto, null, 2),
      validationSchema,
      requiredFields,
    };
  } catch (error) {
    throw error;
  }
}

function transformToPHPDto(input: Column) {
  return Object.entries(input)
    .map(
      ([key, value]) =>
        `  '${key}' => ${
          value.format === 'date-time'
            ? `(new \\DateTime($input['${key}']))->format('Y-m-d H:i:s')`
            : `$input['${key}']`
        } ${value?.required ? '' : ' ?? null'},`
    )
    .join('\n');
}
