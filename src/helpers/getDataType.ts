export default function (type: string) {
  let dataType;
  if (type.includes('int')) {
    dataType = { type: 'integer' };
  } else if (type.includes('varchar')) {
    dataType = { type: 'string' };
  } else if (type.startsWith('enum')) {
    dataType = {
      type: 'string',
      enum: type.match(/'([^']+)'/g)?.map(value => value.replace(/'/g, '')),
    };
  } else if ((type = 'double')) {
    dataType = {
      type: 'number',
    };
  } else {
    dataType = {
      type: 'string',
    };
  }
  return dataType;
}
