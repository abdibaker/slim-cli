type Type =
  | 'int'
  | 'bigint'
  | 'varchar'
  | 'enum'
  | 'double'
  | 'decimal'
  | 'datetime';

export default function getTypeInfo(type: Type) {
  const typeInfo = {
    int: { type: 'integer' },
    bigint: { type: 'integer' },
    varchar: { type: 'string' },
    enum: {
      type: 'string',
      enum: type.match(/'([^']+)'/g)?.map(value => value.replace(/'/g, '')),
    },
    double: { type: 'number' },
    decimal: { type: 'number' },
    datetime: { type: 'string', format: 'date-time' },
  };

  return typeInfo[type] || { type: 'string' };
}
