export type DatabaseType = "mysql" | "postgresql";

export type MysqlType =
	| "varchar"
	| "char"
	| "text"
	| "int"
	| "integer"
	| "smallint"
	| "bigint"
	| "decimal"
	| "float"
	| "double"
	| "date"
	| "datetime"
	| "timestamp"
	| "boolean"
	| "bool"
	| "enum";

export type PostgresType =
	| "character varying"
	| "character"
	| "text"
	| "integer"
	| "smallint"
	| "bigint"
	| "numeric"
	| "real"
	| "double precision"
	| "date"
	| "timestamp without time zone"
	| "timestamp with time zone"
	| "boolean"
	| "USER-DEFINED";

export function getTypeInfo(
	dbType: DatabaseType,
	dataType: MysqlType | PostgresType,
	columnType = "",
	udtName = "",
) {
	const mysqlTypeInfo = {
		varchar: { type: "string" },
		char: { type: "string" },
		text: { type: "string" },
		int: { type: "integer" },
		integer: { type: "integer" },
		smallint: { type: "integer" },
		tinyint: { type: "integer" },
		bigint: { type: "integer" },
		decimal: { type: "number" },
		float: { type: "number" },
		double: { type: "number" },
		date: { type: "string", format: "date" },
		datetime: { type: "string", format: "date-time" },
		timestamp: { type: "string", format: "date-time" },
		boolean: { type: "boolean" },
		bool: { type: "boolean" },
		enum: {
			type: "string",
			enum: columnType
				.match(/'([^']+)'/g)
				?.map((value) => value.replace(/'/g, "")),
		},
	};

	const postgresTypeInfo = {
		"character varying": { type: "string" },
		character: { type: "string" },
		text: { type: "string" },
		integer: { type: "integer" },
		smallint: { type: "integer" },
		bigint: { type: "integer" },
		numeric: { type: "number" },
		real: { type: "number" },
		"double precision": { type: "number" },
		date: { type: "string", format: "date" },
		"timestamp without time zone": { type: "string", format: "date-time" },
		"timestamp with time zone": { type: "string", format: "date-time" },
		boolean: { type: "boolean" },
		"USER-DEFINED":
			udtName === "uuid"
				? { type: "string", format: "uuid" }
				: { type: "string" },
	};

	if (dbType === "mysql") {
		return mysqlTypeInfo[dataType as MysqlType] || { type: "string" };
	}
	if (dbType === "postgresql") {
		return postgresTypeInfo[dataType as PostgresType] || { type: "string" };
	}

	return { type: "string" };
}
