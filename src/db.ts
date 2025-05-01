import dotenv from "dotenv";
import inflection from "inflection";
import knex, { type Knex } from "knex";
import { excludedFields, updatedAtFieldArray } from "./CONST.js";
import {
	type DatabaseType,
	type MysqlType,
	type PostgresType,
	getTypeInfo,
} from "./helpers/getDataType.js";

dotenv.config();

export interface Column {
	[key: string]: ColumnInfo;
}

interface DatabaseRow {
	Field: string;
	Type: MysqlType | PostgresType;
	Null: string;
	Default: string | null;
	Key: string;
	Extra: string;
	udt_name?: string;
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

	const SUPPORTED_DB_CLIENTS = ["mysql", "postgresql"];

	if (
		DB_HOST === undefined ||
		DB_USER === undefined ||
		DB_PASS === undefined ||
		DB_NAME === undefined
	) {
		throw new Error("Missing environment variables");
	}

	if (!DB_CLIENT || !SUPPORTED_DB_CLIENTS.includes(DB_CLIENT)) {
		throw new Error(`Unsupported database client: ${DB_CLIENT}`);
	}

	const DB_CLIENT_NAME = DB_CLIENT === "postgresql" ? "pg" : "mysql2";

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
	tableNameToIdentify: string | undefined,
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

		if (client === "mysql2") {
			for (const name of inflections) {
				const [rows] = await connection.raw("SHOW TABLES LIKE ?", [
					`%${name}%`,
				]);
				if (rows && rows.length > 0) {
					return Object.values(rows[0])[0] as string;
				}
			}
		} else if (client === "pg") {
			for (const name of inflections) {
				const { rows } = await connection.raw(
					`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = ?
            AND table_name ILIKE ?
          LIMIT 1
        `,
					[process.env.DB_SCHEMA || "public", `%${name}%`],
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
		console.error("Error identifying table name:", error);
		throw error;
	}
}

export async function fetchPrimaryKey(tableName: string): Promise<string> {
	try {
		const connection = getConnection();
		const client = connection.client.config.client;

		if (client === "mysql2") {
			const [rows] = await connection.raw(
				`SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'`,
				[tableName],
			);
			return rows.length > 0 ? rows[0].Column_name : "id";
		}
		if (client === "pg") {
			const { rows } = await connection.raw(
				`
          SELECT a.attname
          FROM   pg_index i
          JOIN   pg_attribute a ON a.attrelid = i.indrelid
                              AND a.attnum = ANY(i.indkey)
          JOIN   pg_class c ON c.oid = i.indrelid
          JOIN   pg_namespace n ON n.oid = c.relnamespace
          WHERE  c.relname = ?  -- Table name
          AND    n.nspname = ?  -- Schema name
          AND    i.indisprimary;
      `,
				[tableName, process.env.DB_SCHEMA || "public"],
			);
			return rows.length > 0 ? rows[0].attname : "id";
		}
		throw new Error(`Unsupported database client: ${client}`);
	} catch (error) {
		return "";
	}
}

interface PrimaryKeyInfo {
	data_type: MysqlType | PostgresType;
	column_type?: string;
	udt_name?: string;
}

export async function fetchPrimaryKeyType(
	tableName: string | null,
	primaryKey: string,
): Promise<{ type: string; format?: string }> {
	if (!tableName) {
		return { type: "integer" };
	}

	try {
		const connection = getConnection();
		const client = connection.client.config.client;
		const dbType: DatabaseType = client === "mysql2" ? "mysql" : "postgresql";

		let primaryKeyInfo: PrimaryKeyInfo | null = null;

		if (dbType === "mysql") {
			const [rows] = await connection.raw<[PrimaryKeyInfo[]]>(
				`
        SELECT DATA_TYPE as data_type, COLUMN_TYPE as column_type
        FROM information_schema.columns
        WHERE table_name = ? AND column_name = ?
      `,
				[tableName, primaryKey],
			);
			primaryKeyInfo = rows?.[0] ?? null;
		} else if (dbType === "postgresql") {
			const { rows } = await connection.raw<{ rows: PrimaryKeyInfo[] }>(
				`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = ?
          AND column_name = ?;
      `,
				[process.env.DB_SCHEMA || "public", tableName, primaryKey],
			);
			primaryKeyInfo = rows?.[0] ?? null;
		} else {
			throw new Error(`Unsupported database client: ${client}`);
		}

		if (primaryKeyInfo) {
			return getTypeInfo(
				dbType,
				primaryKeyInfo.data_type,
				primaryKeyInfo.column_type || "", // This will be empty for PostgreSQL
				primaryKeyInfo.udt_name || "", // This will be empty for MySQL
			);
		}
		return { type: "integer" }; // Default to integer if primary key not found
	} catch (error) {
		console.error("Error fetching primary key type:", error);
		throw error;
	}
}

interface ColumnResult {
	columnsToSelect: string;
	phpDto: string;
	phpUpdateDto: string;
	updatedAtField: string | undefined;
}

export async function fetchAllColumns(
	tableName: string,
): Promise<ColumnResult> {
	const connection = getConnection();
	const client = connection.client.config.client;
	let rows: unknown[] | undefined;
	let primaryKeyIsAutoIncrement = false;
	const dbType: DatabaseType = client === "mysql2" ? "mysql" : "postgresql";

	if (client === "mysql2") {
		[rows] = await connection.raw("SHOW COLUMNS FROM ??", [tableName]);
		primaryKeyIsAutoIncrement = !!rows?.find(
			(row: unknown) =>
				(row as { Key: string; Extra: string }).Key === "PRI" &&
				(row as { Key: string; Extra: string }).Extra === "auto_increment",
		);
	} else if (client === "pg") {
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
            AND columns.table_schema = :schema;
      `,
			{
				tableName,
				schema:
					(process as { env: { DB_SCHEMA?: string } })?.env?.DB_SCHEMA ||
					"public",
			},
		);

		rows = result.rows;
		primaryKeyIsAutoIncrement = !!rows?.find(
			(row: unknown) =>
				(row as { Key: string; Extra: string }).Key === "PRI" &&
				(row as { Key: string; Extra: string }).Extra === "auto_increment",
		);
	} else {
		throw new Error(`Unsupported database client: ${client}`);
	}

	const columns: { [key: string]: ColumnInfo } =
		(rows as DatabaseRow[] | undefined)?.reduce<{ [key: string]: ColumnInfo }>(
			(acc, row) => {
				const typeInfo = getTypeInfo(
					dbType,
					row.Type,
					row.Type,
					row.udt_name || "",
				);

				acc[row.Field] = {
					...typeInfo,
					required: row.Default === null && row.Null === "NO",
					exclude:
						row.Extra === "auto_increment" || row.Extra === "DEFAULT_GENERATED",
				};
				return acc;
			},
			{},
		) ?? {};

	const updatedAtField = Object.entries(columns).find(
		([key, value]: [string, ColumnInfo]) =>
			updatedAtFieldArray.includes(key) && value.format === "date-time",
	)?.[0];

	const columnsForSelection =
		(rows as DatabaseRow[] | undefined)?.reduce<{ [key: string]: ColumnInfo }>(
			(acc, row) => {
				if (
					row.Extra !== "DEFAULT_GENERATED" &&
					!excludedFields.includes(row.Field)
				) {
					acc[row.Field] = getTypeInfo(
						dbType,
						row.Type,
						row.Type,
						row.udt_name || "",
					);
				}
				return acc;
			},
			{},
		) ?? {};

	const columnsToSelect = Object.keys(columnsForSelection || {}).join(", ");

	const filteredColumns = Object.keys(columns)
		.filter((key) => !excludedFields.includes(key))
		.reduce<{ [key: string]: ColumnInfo }>((obj, key) => {
			obj[key] = columns[key] ?? ({} as ColumnInfo);
			obj[key].exclude = undefined;
			return obj;
		}, {});

	const insertDto = Object.assign({}, filteredColumns);
	const updateDto = Object.assign({}, filteredColumns);

	const primaryKey = await fetchPrimaryKey(tableName);
	if (primaryKey && primaryKeyIsAutoIncrement) {
		delete insertDto[primaryKey];
	}
	delete updateDto[primaryKey];

	const phpDto = transformToPHPDto(insertDto);
	const phpUpdateDto = transformToPHPUpdateDto(updateDto, updatedAtField);

	insertDto.status = undefined as unknown as ColumnInfo;

	if (primaryKeyIsAutoIncrement) {
		delete insertDto[primaryKey];
	}

	return {
		columnsToSelect,
		phpDto,
		phpUpdateDto,
		updatedAtField,
	};
}

function transformToPHPDto(input: Column): string {
	return Object.entries(input)
		.map(([key, value]) => {
			if (value.format === "date-time") {
				return `  '${key}' => $input['${key}'] ? (new \\DateTime($input['${key}']))->format('Y-m-d H:i:s') : ${
					value?.required ? "date('Y-m-d H:i:s')" : "null"
				},`;
			}
			return `  '${key}' => $input['${key}'] ${
				value.required ? "" : "?: null"
			},`;
		})
		.join("\n");
}

function transformToPHPUpdateDto(
	input: Column,
	updatedAtField: string | undefined,
): string {
	return (
		Object.entries(input)
			.map(([key, value]) => {
				if (value.format === "date-time") {
					return `  '${key}' => $input['${key}'] ? (new \\DateTime($input['${key}']))->format('Y-m-d H:i:s') : ($input['${key}'] ? $input['${key}'] : null),`;
				}
				return `  '${key}' => $input['${key}'] ?: null,`;
			})
			.join("\n") +
		(updatedAtField ? `\n  '${updatedAtField}' => date('Y-m-d H:i:s'),` : "")
	);
}
