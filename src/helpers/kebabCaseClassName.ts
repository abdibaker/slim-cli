import inflection from 'inflection';

export function kebabCaseClassName(className: string): string {
  const words = inflection.underscore(className).split('_');
  const lastIndex = words.length - 1;

  if (
    words[lastIndex] &&
    words[lastIndex] !== 'auth' &&
    words[lastIndex] !== 'shehia'
  ) {
    words[lastIndex] = inflection.pluralize(words[lastIndex]);
  }

  return words.join('-').toLowerCase();
}
