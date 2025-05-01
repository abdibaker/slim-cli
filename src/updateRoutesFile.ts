import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROUTES_FILE, TEMPLATE_PATH } from "./CONST.js";
import { fileExists } from "./helpers/fileExist.js";
import { replaceTemplatePlaceholders } from "./helpers/replaceTemplatePlaceholders.js";

interface props {
	classNameLowFirst: string;
	className: string;
	routeName: string;
	primaryKey: string;
}

export async function updateRoutesFile({
	classNameLowFirst,
	className,
	routeName,
	primaryKey,
}: props) {
	if (!(await fileExists(ROUTES_FILE))) {
		throw new Error('File "App/Routes.php" does not exist.');
	}
	const existingRouteContent = await readFile(ROUTES_FILE, "utf-8");
	const routeContentPath = path.join(TEMPLATE_PATH, "App", "Routes.php");
	const routeContent = await readFile(routeContentPath, "utf-8");

	const lines = existingRouteContent.split("\n");
	const returnAppLineIndex = lines.findIndex((line: string | string[]) =>
		line.includes("return $app;"),
	);

	const beforeReturnApp = lines.slice(0, returnAppLineIndex).join("\n");
	const afterReturnApp = lines.slice(returnAppLineIndex).join("\n");

	const newContent = replaceTemplatePlaceholders(routeContent, {
		classNameLowFirst,
		className,
		routeName,
		primaryKey,
	});
	const updatedContent = `${beforeReturnApp}\n\n${newContent}\n\n${afterReturnApp}`;

	await writeFile(ROUTES_FILE, updatedContent);
}
