export default function getType(type: string) {
  if (type.includes('int')) {
    return { type: 'integer' };
  } else if (type.includes('varchar')) {
    return { type: 'string' };
  } else if (type.startsWith('enum')) {
    return {
      type: 'string',
      enum: type.match(/'([^']+)'/g)?.map(value => value.replace(/'/g, '')),
    };
  } else if (type === 'double') {
    return {
      type: 'number',
    };
  } else {
    return {
      type: 'string',
    };
  }
}
