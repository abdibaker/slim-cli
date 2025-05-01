export function replaceTemplatePlaceholders(
	content: string,
	replacements: { [s: string]: unknown } | ArrayLike<unknown>,
) {
	return Object.entries(replacements).reduce(
		(result, [placeholder, replacement]) => {
			const regex = new RegExp(`{{${placeholder}}}`, "g");
			return result.replace(regex, replacement as string);
		},
		content,
	);
}
