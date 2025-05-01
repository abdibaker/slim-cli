import { readFileSync, writeFileSync } from "node:fs";
import chalk from "chalk";
import inflection from "inflection";
import { ROUTES_FILE, getControllerPath, getServicePath } from "./CONST.js";
import { fetchPrimaryKeyType, identifyTableName } from "./db.js";
import { generateDtoSchema } from "./generateDtoSchema.js";
import { kebabCaseClassName } from "./helpers/kebabCaseClassName.js";
import getIpAddressAndFreePort from "./utils/getIpAndFreePort.js";

interface SwaggerPathParameters {
	name: string;
	in: string;
	required: boolean;
	schema: { type: string };
}

interface SwaggerPathResponses {
	[statusCode: number]: {
		description?: string;
		content?: {
			[contentType: string]: {
				schema: {
					type: string;
					items?: {
						type: string;
						properties?: {
							[propertyName: string]: { type: string };
						};
					};
					properties?: {
						[propertyName: string]: { type: string };
					};
				};
			};
		};
		$ref?: string;
	};
}

interface SwaggerPathMethods {
	[methodName: string]: {
		tags: string[];
		parameters: SwaggerPathParameters[];
		requestBody?: unknown;
		responses: SwaggerPathResponses;
	};
}

interface SwaggerPaths {
	[pathName: string]: SwaggerPathMethods;
}

interface SwaggerSchema {
	openapi: string;
	info: {
		title: string;
		version: string;
		description: string;
		contact: {
			email: string;
			name: string;
			url: string;
		};
	};
	servers: Array<{ url: string; description: string }>;
	components: {
		securitySchemes: { [scheme: string]: unknown };
		responses: { [response: string]: { description: string } };
	};
	security: unknown[];
	paths: SwaggerPaths;
}

interface ResponseSchema {
	type: string;
	properties?: {
		[propertyName: string]: {
			type: string;
			description?: string;
		};
	};
	items?: {
		type: string;
		properties?: {
			[propertyName: string]: {
				type: string;
				description?: string;
			};
		};
	};
}

function readFileContent(filePath: string): string {
	return readFileSync(filePath, "utf8");
}

const { ip, port } = await getIpAddressAndFreePort();

const swagger: SwaggerSchema = {
	openapi: "3.1.1",
	info: (() => {
		try {
			return JSON.parse(
				readFileSync(`${process.cwd()}/swagger.info.json`, "utf8"),
			);
		} catch (error) {
			return {
				title: "API Documentation",
				version: "1.0.0",
				description: "API Documentation",
				contact: {
					email: "",
					name: "",
					url: "",
				},
			};
		}
	})(),
	servers: [{ url: `http://${ip}:${port}`, description: "Local server" }],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		responses: {
			UnauthorizedError: {
				description: "Access token is missing or invalid",
			},
		},
	},
	security: [
		{
			bearerAuth: [],
		},
	],
	paths: {},
};

/**
 * Extracts query parameters from a controller function.
 * Looks for patterns like $request->getQueryParams()['paramName']
 * @param controllerName The name of the controller file
 * @param functionName The name of the function to analyze
 * @returns Array of query parameter objects for Swagger
 */
async function extractQueryParams(
	controllerName: string,
	functionName: string,
): Promise<SwaggerPathParameters[]> {
	try {
		// Ensure both parameters are defined before proceeding
		if (!controllerName || !functionName) {
			return [];
		}

		// Read the controller file
		const controllerPath = getControllerPath(controllerName);

		let phpCode = "";
		try {
			phpCode = readFileSync(controllerPath, "utf8");
		} catch (err) {
			// If we can't read the file, return empty array
			return [];
		}

		// Extract the function content - use a more flexible regex pattern
		// This pattern looks for a function with the given name and captures everything until the closing brace
		// It handles nested braces properly by counting them
		let functionContent = "";
		const functionStartRegex = new RegExp(
			`public\\s+function\\s+${functionName}\\s*\\([^{]*\\{`,
			"i",
		);
		const startMatch = functionStartRegex.exec(phpCode);

		if (startMatch) {
			// Found the start of the function
			const startIndex = startMatch.index;
			let braceCount = 1; // We've already found the opening brace
			let currentIndex = startIndex + startMatch[0].length;

			// Find the matching closing brace by counting braces
			while (braceCount > 0 && currentIndex < phpCode.length) {
				const char = phpCode[currentIndex];
				if (char === "{") braceCount++;
				if (char === "}") braceCount--;
				currentIndex++;
			}

			// Extract the full function content including the signature
			if (braceCount === 0) {
				functionContent = phpCode.substring(startIndex, currentIndex);
			}
		}

		if (!functionContent) {
			return [];
		}

		// Look for query parameter patterns
		// First pattern: $request->getQueryParams()['paramName']
		const queryParamRegex = /\$request->getQueryParams\(\)\[['"](\w+)['"]\]/g;
		// Second pattern: $params['paramName']
		const paramsRegex = /\$params\[['"](\w+)['"]\]/g;

		const queryParams: SwaggerPathParameters[] = [];
		let match: RegExpExecArray | null;

		// Process the first pattern (request->getQueryParams)
		match = queryParamRegex.exec(functionContent);
		while (match !== null) {
			// Ensure we have a capture group match
			if (match?.[1]) {
				const paramName = match[1];

				// Check if this parameter is already in the array
				if (!queryParams.some((param) => param.name === paramName)) {
					queryParams.push({
						name: paramName,
						in: "query",
						required: false, // Query params are typically optional
						schema: { type: "string" }, // Default to string type
					});
				}
			}
		}

		// Process the second pattern ($params)
		match = paramsRegex.exec(functionContent);
		while (match !== null) {
			// Ensure we have a capture group match
			if (match?.[1]) {
				const paramName = match[1];

				// Check if this parameter is already in the array
				if (!queryParams.some((param) => param.name === paramName)) {
					queryParams.push({
						name: paramName,
						in: "query",
						required: false,
						schema: { type: "string" },
					});
				}
			}
		}

		return queryParams;
	} catch (error) {
		// Silently return empty array instead of logging errors
		// This prevents console spam when files don't exist
		return [];
	}
}

/**
 * Extracts the returned data from a controller function and returns a Swagger response schema.
 * @param controllerName The name of the controller file
 * @param functionName The name of the function to analyze
 * @returns A Swagger response schema object
 */
async function extractReturnedData(
	controllerName: string,
	functionName: string,
): Promise<SwaggerPathResponses> {
	try {
		// Get the service file path
		const servicePath = getServicePath(controllerName);

		// Read the service file
		let phpCode = "";
		try {
			phpCode = readFileSync(servicePath, "utf8");
		} catch (err) {
			return {
				200: {
					description: "Read the service file error",
				},
			};
		}

		// Extract the function content
		let functionContent = "";
		const functionStartRegex = new RegExp(
			`public\\s+function\\s+${functionName}\\s*\\([^{]*\\{`,
			"i",
		);
		const startMatch = functionStartRegex.exec(phpCode);

		if (startMatch) {
			const startIndex = startMatch.index;
			let braceCount = 1;
			let currentIndex = startIndex + startMatch[0].length;

			while (braceCount > 0 && currentIndex < phpCode.length) {
				const char = phpCode[currentIndex];
				if (char === "{") braceCount++;
				if (char === "}") braceCount--;
				currentIndex++;
			}

			if (braceCount === 0) {
				functionContent = phpCode.substring(startIndex, currentIndex);
			}
		}

		if (!functionContent) {
			return {
				200: {
					description: "Extract the function content error",
				},
			};
		}

		// Look for SQL queries
		const sqlRegex = /<<<SQL\s*\n([\s\S]*?)\n\s*SQL\s*;/g;
		const sqlMatches = functionContent.match(sqlRegex);

		if (!sqlMatches) {
			return {
				200: {
					description: "No SQL queries found",
				},
			};
		}

		// Analyze the SQL query to determine the response structure
		const sqlQuery = sqlMatches[0].replace(/<<<SQL\s*\n|SQL\s*;/g, "");

		// Check if it's a single row or multiple rows query based on database methods
		const isSingleRow =
			functionContent.includes("fetchAssociative") ||
			functionContent.includes("fetchOne") ||
			functionContent.includes("fetchAssoc");

		// Extract column names from SELECT statements
		const selectRegex = /SELECT\s+([\s\S]*?)\s+FROM/i;
		const selectMatch = sqlQuery.match(selectRegex);

		if (!selectMatch || !selectMatch[1]) {
			return {
				200: {
					description: "No SELECT statement found",
				},
			};
		}

		const columns = selectMatch[1]
			.split(",")
			.map((col) => col.trim())
			.map((col) => {
				// Handle aliased columns
				const aliasMatch = col.match(/AS\s+`?(\w+)`?$/i);
				return aliasMatch ? aliasMatch[1] : col.replace(/`/g, "");
			});

		// Create column properties
		const columnProperties: {
			[key: string]: { type: string; description: string };
		} = {};
		for (const column of columns) {
			columnProperties[column as string] = {
				type: "string",
				description: `The ${column} field`,
			};
		}

		// Create the response schema based on query type
		const responseSchema: ResponseSchema = isSingleRow
			? {
					type: "object",
					properties: columnProperties,
				}
			: {
					type: "array",
					items: {
						type: "object",
						properties: columnProperties,
					},
				};

		return {
			200: {
				description: isSingleRow
					? "Single object response"
					: "Array of objects response",
				content: {
					"application/json": {
						schema: responseSchema,
					},
				},
			},
		};
	} catch (error) {
		// Return default response on error
		return {
			200: {
				description: "Extract the returned data error",
			},
		};
	}
}

/**
 * Generates Swagger/OpenAPI documentation by parsing route definitions
 * from the specified routes file. Each route is processed to extract
 * HTTP method, path, controller, and action. Parameters and request
 * bodies are determined for dynamic paths and appropriate schemas are
 * generated. The resulting Swagger documentation is written to a JSON
 * file for API documentation purposes.
 */
export async function generateSwagger() {
	const routeContent: string = readFileContent(ROUTES_FILE);

	const routePattern: RegExp =
		/(\$app->\w+\(['"](?:\/[^'"]*)*['"]\s*,?\s*["'].*?["']\);)/g;

	const matches: RegExpMatchArray | null = routeContent.match(routePattern);

	try {
		if (matches) {
			const routeProcessing = matches.map(async (route) => {
				const method = (
					route.match(/\$\w+->(\w+)\(/) as RegExpMatchArray
				)[1]?.toLowerCase();
				let path = (route.match(/'\S*'/) as RegExpMatchArray)[0];
				path = path.substring(1, path.length - 1);

				if (!method) {
					return;
				}
				if (
					path === "/" ||
					path === "/api" ||
					path === "/status" ||
					path === "/swagger-ui"
				) {
					return;
				}

				const parts: string[] = route.split(",");

				const [tag, action]: string[] = parts[parts.length - 1]
					?.replace(/[);{$"\s]/g, "")
					.split("}") || ["", ""];

				const regexPattern: RegExp = new RegExp(`\\$${tag}\\s*=\\s*'([^']+)`);
				const controllerMatch: RegExpExecArray | null =
					regexPattern.exec(routeContent);
				const controller = controllerMatch
					? controllerMatch[1]
							?.replace(":", "")
							.replace("App\\Controller\\", "")
							.concat(".php")
					: "";

				const service = controller?.replace("Controller", "Service");

				let parameters: SwaggerPathParameters[] = [];

				const matches: RegExpMatchArray | null = path.match(/{[^}]+}/g);

				if (!tag) {
					return;
				}

				if (matches) {
					const tableName = await identifyTableName(tag);
					parameters = await Promise.all(
						matches.map(async (match) => ({
							name: match.substring(1, match.length - 1),
							in: "path",
							required: true,
							schema: await fetchPrimaryKeyType(
								tableName,
								match.substring(1, match.length - 1),
							),
						})),
					);
				}

				// Extract query parameters from the controller function
				const queryParams = await extractQueryParams(
					controller || "",
					action || "",
				);

				// Merge path parameters and query parameters
				if (queryParams.length > 0) {
					parameters = [...parameters, ...queryParams];
				}

				const routeObj = {
					path: `/${kebabCaseClassName(tag)}${path}`,
					method,
					controller,
					tag: inflection.camelize(tag),
					action,
					parameters: JSON.stringify(parameters),
				};

				if (!swagger.paths[routeObj.path]) {
					swagger.paths[routeObj.path] = {};
				}

				if (routeObj.method === "get") {
					const responses = await extractReturnedData(
						controller || "",
						action || "",
					);
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					swagger.paths[routeObj.path]![routeObj.method] = {
						tags: [routeObj.tag],
						parameters: parameters,
						responses: responses,
					};
				} else {
					const requestBodySchema = await generateDtoSchema(
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						controller!,
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						routeObj.action!,
					);
					const responses = await extractReturnedData(
						controller || "",
						action || "",
					);
					const requestBody = {
						content: {
							"application/json": {
								schema: requestBodySchema,
							},
						},
					};

					// biome-ignore lint/style/noNonNullAssertion: <I know what I'm doing>
					swagger.paths[routeObj.path]![routeObj.method] = {
						tags: [routeObj.tag],
						parameters: parameters,
						requestBody:
							routeObj.method === "post" || routeObj.method === "put"
								? requestBody
								: undefined,
						responses: responses,
					};
				}

				// biome-ignore lint/style/noNonNullAssertion: <I know what I'm doing>
				swagger.paths[routeObj.path]![routeObj.method]!.responses[401] = {
					$ref: "#/components/responses/UnauthorizedError",
				};
			});
			await Promise.all(routeProcessing);
		}
		writeFileSync(
			"public/swagger/swagger.json",
			JSON.stringify(swagger, null, 2),
		);
	} catch (error) {
		console.error(chalk.red(`An error occurred: ${(error as Error).message}`));
		process.exit(1);
	}
}
