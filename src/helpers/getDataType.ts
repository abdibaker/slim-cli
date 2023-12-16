export type MysqlType =
  | 'varchar'
  | 'char'
  | 'text'
  | 'int'
  | 'integer'
  | 'smallint'
  | 'bigint'
  | 'bigint'
  | 'decimal'
  | 'float'
  | 'double'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'boolean'
  | 'bool';

export default function getTypeInfo(
  mysqlType: MysqlType,
  COLUMN_TYPE: string = ''
) {
  const typeInfo = {
    varchar: { type: 'string' },
    char: { type: 'string' },
    text: { type: 'string' },
    int: { type: 'integer' },
    integer: { type: 'integer' },
    smallint: { type: 'integer' },
    bigint: { type: 'integer' },
    decimal: { type: 'number' },
    float: { type: 'number' },
    double: { type: 'number' },
    date: { type: 'string', format: 'date' },
    datetime: { type: 'string', format: 'date-time' },
    timestamp: { type: 'string', format: 'date-time' },
    boolean: { type: 'boolean' },
    bool: { type: 'boolean' },
    enum: {
      type: 'string',
      enum: COLUMN_TYPE?.match(/'([^']+)'/g)?.map(value =>
        value.replace(/'/g, '')
      ),
    },
  };

  return typeInfo[mysqlType] || { type: 'string' };
}
