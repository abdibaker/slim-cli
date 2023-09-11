export function replaceTemplatePlaceholders(
  content: any,
  replacements: { [s: string]: unknown } | ArrayLike<unknown>
) {
  return Object.entries(replacements).reduce(
    (result, [placeholder, replacement]) => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      return result.replace(regex, replacement);
    },
    content
  );
}
