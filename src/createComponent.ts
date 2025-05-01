import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SRC_DIR, TEMPLATE_PATH } from "./CONST.js";
import { fileExists } from "./helpers/fileExist.js";
import { replaceTemplatePlaceholders } from "./helpers/replaceTemplatePlaceholders.js";

interface props {
	className: string;
	tableName: string;
	primaryKey: string;
	primaryKeyType: { type: string };
	classNameLowFirst?: string;
	columnsToSelect?: string;
	phpDto?: string;
	phpUpdateDto?: string;
}

export async function createComponent(
	type: "Service" | "Controller",
	{
		className,
		tableName,
		primaryKey,
		primaryKeyType,
		classNameLowFirst,
		columnsToSelect,
		phpDto,
		phpUpdateDto,
	}: props,
) {
	const componentDir = path.join(SRC_DIR, type);
	const componentPath = path.join(componentDir, `${className}${type}.php`);
	const templatePath = path.join(TEMPLATE_PATH, type, "base.php");

	await mkdir(componentDir, { recursive: true });

	if (await fileExists(componentPath)) {
		throw new Error(`Endpoint "/${classNameLowFirst}" already exists.`);
	}
	const templateContent = await readFile(templatePath, "utf-8");
	const replacedContent = replaceTemplatePlaceholders(templateContent, {
		tableName:
			(process.env.DB_SCHEMA ? `${process.env.DB_SCHEMA}.` : "") + tableName,
		primaryKey: primaryKey,
		primaryKeyType: primaryKeyType.type === "integer" ? "int" : "string",
		className,
		classNameLowFirst,
		columnsToSelect,
		phpDto,
		phpUpdateDto,
	});

	await writeFile(componentPath, replacedContent);
}
