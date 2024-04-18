import inflection from 'inflection';

export function kebabCaseClassName(className: string) {
  const words = inflection.dasherize(className).split('_');
  const lastIndex = words.length - 1;
  words[lastIndex] = inflection.pluralize(words[lastIndex]!);
  return words.join('-').toLowerCase();
}
