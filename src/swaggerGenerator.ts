import chalk from 'chalk';
import inflection from 'inflection';
import { readFileSync, writeFileSync } from 'node:fs';
import { ROUTES_FILE } from './CONST.js';
import { fetchPrimaryKeyType, identifyTableName } from './db.js';
import { generateDtoSchema } from './generateDtoSchema.js';
import { kebabCaseClassName } from './helpers/kebabCaseClassName.js';
import { extractQueryParams } from './libs/extractQueryParams.js';
import type { SwaggerPathParameters, SwaggerPathResponses } from './types.js';
import getIpAddressAndFreePort from './utils/getIpAndFreePort.js';
import { extractReturnedData } from './libs/extractReturnedData.js';

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

function readFileContent(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

const { ip, port } = await getIpAddressAndFreePort();

const swagger: SwaggerSchema = {
  openapi: '3.1.1',
  info: (() => {
    try {
      return JSON.parse(
        readFileSync(`${process.cwd()}/swagger.info.json`, 'utf8')
      );
    } catch (error) {
      return {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'API Documentation',
        contact: {
          email: '',
          name: '',
          url: '',
        },
      };
    }
  })(),
  servers: [{ url: `http://${ip}:${port}`, description: 'Local server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
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
 * Generates Swagger/OpenAPI documentation by parsing route definitions
 * from the specified routes file. Each route is processed to extract
 * HTTP method, path, controller, and action. Parameters and request
 * bodies are determined for dynamic paths and appropriate schemas are
 * generated. The resulting Swagger documentation is written to a JSON
 * file for API documentation purposes.
 */
export async function generateSwagger() {
  const routeContent: string = readFileContent(ROUTES_FILE);

  // Updated pattern to handle routes with middleware (->add()) and without
  const routePattern: RegExp =
    /(\$app->\w+\(['"](?:\/[^'"]*)*['"]\s*,?\s*["'].*?["']\)(?:->add\([^)]*\))?;)/g;

  // Pattern to extract group definitions and their prefixes
  const groupPattern: RegExp = /\$app->group\(['"]([^'"]+)['"],/g;

  // Extract all groups and their prefixes
  const groups: {
    prefix: string | undefined;
    startIndex: number;
    endIndex: number;
  }[] = [];
  let groupMatch: RegExpExecArray | null = groupPattern.exec(routeContent);
  while (groupMatch !== null) {
    const prefix = groupMatch[1];
    const startIndex = groupMatch.index;

    // Find the matching closing brace for this group
    let braceCount = 0;
    let endIndex = startIndex;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex; i < routeContent.length; i++) {
      const char = routeContent[i];

      if ((char === '"' || char === "'") && routeContent[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    groups.push({ prefix, startIndex, endIndex });
    groupMatch = groupPattern.exec(routeContent);
  }

  const matches: RegExpMatchArray | null = routeContent.match(routePattern);

  try {
    if (matches) {
      const routeProcessing = matches.map(async route => {
        const method = (
          route.match(/\$\w+->(\w+)\(/) as RegExpMatchArray
        )[1]?.toLowerCase();
        const pathMatch = route.match(/'\S*'/);
        if (!pathMatch) {
          return;
        }
        let path = pathMatch[0];
        path = path.substring(1, path.length - 1);

        // Find which group this route belongs to
        const routeIndex: number = routeContent.indexOf(route);
        const belongsToGroup = groups.find(
          group => routeIndex > group.startIndex && routeIndex < group.endIndex
        );

        // Add group prefix to path if route belongs to a group
        if (belongsToGroup) {
          path = belongsToGroup.prefix + path;
        }

        if (!method) {
          return;
        }
        if (
          path === '/' ||
          path === '/api' ||
          path === '/status' ||
          path === '/swagger-ui'
        ) {
          return;
        }

        const parts: string[] = route.split(',');

        const [tag, action]: string[] = parts[parts.length - 1]
          ?.replace(/[);{$"\s]/g, '')
          .split('}') || ['', ''];

        const regexPattern: RegExp = new RegExp(`\\$${tag}\\s*=\\s*'([^']+)`);
        const controllerMatch: RegExpExecArray | null =
          regexPattern.exec(routeContent);
        const controller = controllerMatch
          ? controllerMatch[1]
              ?.replace(':', '')
              .replace('App\\Controller\\', '')
              .concat('.php')
          : '';

        let parameters: SwaggerPathParameters[] = [];

        const matches: RegExpMatchArray | null = path.match(/{[^}]+}/g);

        if (!tag) {
          return;
        }

        if (matches) {
          const tableName = await identifyTableName(tag);
          parameters = await Promise.all(
            matches.map(async match => ({
              name: match.substring(1, match.length - 1),
              in: 'path',
              required: true,
              schema: await fetchPrimaryKeyType(
                tableName,
                match.substring(1, match.length - 1)
              ),
            }))
          );
        }

        // Extract query parameters from the controller function
        const queryParams = await extractQueryParams(
          controller || '',
          action || ''
        );

        // Merge path parameters and query parameters
        if (queryParams.length > 0) {
          parameters = [...parameters, ...queryParams];
        }

        // Use group prefix if route belongs to a group, otherwise use controller prefix
        const finalPath = belongsToGroup ? path : `/${kebabCaseClassName(tag)}${path}`;
        
        const routeObj = {
          path: finalPath,
          method,
          controller,
          tag: inflection.camelize(tag),
          action,
          parameters: JSON.stringify(parameters),
        };

        if (!swagger.paths[routeObj.path]) {
          swagger.paths[routeObj.path] = {};
        }

        if (routeObj.method === 'get') {
          const responses = await extractReturnedData(
            controller || '',
            action || ''
          );
          swagger.paths[routeObj.path]![routeObj.method] = {
            tags: [routeObj.tag],
            parameters: parameters,
            responses: responses,
          };
        } else {
          const requestBodySchema = await generateDtoSchema(
            controller!,
            routeObj.action!
          );
          const responses = await extractReturnedData(
            controller || '',
            action || ''
          );
          const requestBody = {
            content: {
              'application/json': {
                schema: requestBodySchema,
              },
            },
          };

          swagger.paths[routeObj.path]![routeObj.method] = {
            tags: [routeObj.tag],
            parameters: parameters,
            requestBody:
              routeObj.method === 'post' || routeObj.method === 'put'
                ? requestBody
                : undefined,
            responses: responses,
          };
        }

        swagger.paths[routeObj.path]![routeObj.method]!.responses[401] = {
          $ref: '#/components/responses/UnauthorizedError',
        };
      });
      await Promise.all(routeProcessing);
    }
    writeFileSync(
      'public/swagger/swagger.json',
      JSON.stringify(swagger, null, 2)
    );
  } catch (error) {
    console.error(chalk.red(`An error occurred: ${(error as Error).message}`));
    process.exit(1);
  }
}
