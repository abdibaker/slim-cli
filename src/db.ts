import dotenv from 'dotenv';
import inflection from 'inflection';
import knex, { Knex } from 'knex';
import { excludedFields, updatedAtFieldArray } from './CONST.js';
import {
  DatabaseType,
  getTypeInfo,
  MysqlType,
  PostgresType,
} from './helpers/getDataType.js';

dotenv.config();

export interface Column {
  [key: string]: ColumnInfo;
}

interface ColumnInfo {
  type: string;
  format?: string;
  required?: boolean;
  exclude?: boolean;
  enum?: string[];
}

let conn: Knex | null = null;

export function getConnection() {
  if (conn) return conn;

  const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_CLIENT } = process.env;

  const SUPPORTED_DB_CLIENTS = ['mysql', 'postgresql'];

  if (
    DB_HOST === undefined ||
    DB_USER === undefined ||
    DB_PASS === undefined ||
    DB_NAME === undefined
  ) {
    throw new Error('Missing environment variables');
  }

  if (!DB_CLIENT || !SUPPORTED_DB_CLIENTS.includes(DB_CLIENT)) {
    throw new Error(`Unsupported database client: ${DB_CLIENT}`);
  }

  const DB_CLIENT_NAME = DB_CLIENT === 'postgresql' ? 'pg' : 'mysql2';

  conn = knex({
    client: DB_CLIENT_NAME,
    connection: {
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    },
  });

  return conn;
}

export async function identifyTableName(
  tableNameToIdentify: string | undefined
): Promise<string | null> {
  if (!tableNameToIdentify) return null;

  const inflections = [
    tableNameToIdentify,
    inflection.tableize(tableNameToIdentify),
    inflection.dasherize(tableNameToIdentify),
    inflection.underscore(tableNameToIdentify),
    inflection.camelize(tableNameToIdentify),
    tableNameToIdentify.toLowerCase(),
  ];

  try {
    const connection = getConnection();
    const client = connection.client.config.client;

    if (client === 'mysql2') {
      for (const name of inflections) {
        const [rows] = await connection.raw(`SHOW TABLES LIKE ?`, [
          `%${name}%`,
        ]);
        if (rows && rows.length > 0) {
          return Object.values(rows[0])[0] as string;
        }
      }
    } else if (client === 'pg') {
      for (const name of inflections) {
        const { rows } = await connection.raw(
          `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name ILIKE ?
          LIMIT 1
        `,
          [`%${name}%`]
        );

        if (rows && rows.length > 0) {
          return rows[0].table_name;
        }
      }
    } else {
      throw new Error(`Unsupported database client: ${client}`);
    }

    return null;
  } catch (error) {
    console.error('Error identifying table name:', error);
    throw error;
  }
}

export async function fetchPrimaryKey(tableName: string): Promise<string> {
  try {
    const connection = getConnection();
    const client = connection.client.config.client;

    if (client === 'mysql2') {
      const [rows] = await connection.raw(
        `SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'`,
        [tableName]
      );
      return rows.length > 0 ? rows[0].Column_name : 'id';
    } else if (client === 'pg') {
      const { rows } = await connection.raw(
        `
        SELECT a.attname
        FROM   pg_index i
        JOIN   pg_attribute a ON a.attrelid = i.indrelid
                              AND a.attnum = ANY(i.indkey)
        WHERE  i.indrelid = ?::regclass
        AND    i.indisprimary
      `,
        [tableName]
      );
      return rows.length > 0 ? rows[0].attname : 'id';
    } else {
      throw new Error(`Unsupported database client: ${client}`);
    }
  } catch (error) {
    return '';
  }
}

export async function fetchPrimaryKeyType(
  tableName: string | null,
  primaryKey: string
) {
  if (!tableName) {
    return { type: 'integer' };
  }

  try {
    const connection = getConnection();
    const client = connection.client.config.client;
    const dbType: DatabaseType = client === 'mysql2' ? 'mysql' : 'postgresql';

    let primaryKeyInfo;

    if (dbType === 'mysql') {
      const [rows] = await connection.raw(
        `
        SELECT DATA_TYPE, COLUMN_TYPE
        FROM information_schema.columns
        WHERE table_name = ? AND column_name = ?
      `,
        [tableName, primaryKey]
      );
      primaryKeyInfo = rows[0];
    } else if (dbType === 'postgresql') {
      const { rows } = await connection.raw(
        `
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = ? AND column_name = ?
      `,
        [tableName, primaryKey]
      );
      primaryKeyInfo = rows[0];
    } else {
      throw new Error(`Unsupported database client: ${client}`);
    }

    if (primaryKeyInfo) {
      return getTypeInfo(
        dbType,
        primaryKeyInfo.data_type as MysqlType | PostgresType,
        primaryKeyInfo.column_type || '', // This will be empty for PostgreSQL
        primaryKeyInfo.udt_name || '' // This will be empty for MySQL
      );
    } else {
      return { type: 'integer' }; // Default to integer if primary key not found
    }
  } catch (error) {
    console.error('Error fetching primary key type:', error);
    throw error;
  }
}

export async function fetchAllColumns(tableName: string) {
  try {
    const connection = getConnection();
    const client = connection.client.config.client;
    let rows: any[] | undefined;
    let primaryKeyIsAutoIncrement = false;
    const dbType: DatabaseType = client === 'mysql2' ? 'mysql' : 'postgresql';

    if (client === 'mysql2') {
      [rows] = await connection.raw(`SHOW COLUMNS FROM ??`, [tableName]);
      primaryKeyIsAutoIncrement = !!rows?.find(
        (row: any) => row.Key === 'PRI' && row.Extra === 'auto_increment'
      );
    } else if (client === 'pg') {
      const result = await connection.raw(
        `
          SELECT
            columns.column_name AS "Field",
            columns.data_type AS "Type",
            columns.is_nullable AS "Null",
            columns.column_default AS "Default",
            CASE
              WHEN pk.constraint_type = 'PRIMARY KEY' THEN 'PRI'
              ELSE ''
            END AS "Key",
            CASE
              WHEN columns.column_default LIKE 'nextval%' THEN 'auto_increment'
              ELSE ''
            END AS "Extra"
          FROM
            information_schema.columns AS columns
            LEFT JOIN (
              SELECT
                kcu.column_name,
                tc.constraint_type
              FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
              WHERE
                tc.table_name = :tableName
                AND tc.constraint_type = 'PRIMARY KEY'
            ) AS pk ON columns.column_name = pk.column_name
          WHERE
            columns.table_name = :tableName
            AND columns.table_schema = 'public';
      `,
        { tableName }
      );

      rows = result.rows;
      primaryKeyIsAutoIncrement = !!rows?.find(
        (row: any) => row.Key === 'PRI' && row.Extra === 'auto_increment'
      );
    } else {
      throw new Error(`Unsupported database client: ${client}`);
    }

    const columns: { [key: string]: ColumnInfo } = rows?.reduce(
      (acc, row: any) => {
        const typeInfo = getTypeInfo(
          dbType,
          row.Type as MysqlType | PostgresType,
          row.Type,
          row.udt_name
        );

        acc[row.Field] = {
          ...typeInfo,
          required: row.Default === null && row.Null === 'NO',
          exclude:
            row.Extra === 'auto_increment' || row.Extra === 'DEFAULT_GENERATED',
        };
        return acc;
      },
      {} as { [key: string]: ColumnInfo }
    );

    const updatedAtField = Object.entries(columns).find(
      ([key, value]: [string, ColumnInfo]) =>
        updatedAtFieldArray.includes(key) && value.format === 'date-time'
    )?.[0];

    const columnsForSelection = rows?.reduce((acc, row: any) => {
      if (
        row.Extra !== 'DEFAULT_GENERATED' &&
        !excludedFields.includes(row.Field)
      ) {
        acc[row.Field] = getTypeInfo(
          dbType,
          row.Type as MysqlType | PostgresType,
          row.Type,
          row.udt_name
        );
      }
      return acc;
    }, {});

    const columnsToSelect = Object.keys(columnsForSelection).join(', ');

    const filteredColumns = Object.keys(columns)
      .filter(key => !excludedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = columns[key];
        delete obj[key].exclude;
        return obj;
      }, {} as { [key: string]: any });

    const insertDto = Object.assign({}, filteredColumns);
    const updateDto = Object.assign({}, filteredColumns);

    const primaryKey = await fetchPrimaryKey(tableName);
    if (primaryKey && primaryKeyIsAutoIncrement) {
      delete insertDto[primaryKey];
    }
    delete updateDto[primaryKey];

    const phpDto = transformToPHPDto(insertDto);
    const phpUpdateDto = transformToPHPUpdateDto(updateDto, updatedAtField);

    delete insertDto.status;

    if (primaryKeyIsAutoIncrement) {
      delete insertDto[primaryKey];
    }

    return {
      columnsToSelect,
      phpDto,
      phpUpdateDto,
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
        return `  '${key}' => $input['${key}'] ${
          value.required ? '' : '?: null'
        },`;
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
          return `  '${key}' => $input['${key}'] ?: null,`;
        }
      })
      .join('\n') +
    (updatedAtField ? `\n  '${updatedAtField}' => date('Y-m-d H:i:s'),` : '')
  );
}
