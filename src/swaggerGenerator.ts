import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import inflection from 'inflection';
import { ROUTES_FILE } from './CONST.js';
import { fetchPrimaryKeyType, identifyTableName } from './db.js';
import { generateDtoSchema } from './generateDtoSchema.js';
import { kebabCaseClassName } from './helpers/kebabCaseClassName.js';
import getIpAddressAndFreePort from './utils/getIpAndFreePort.js';

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
    requestBody?: any;
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
    securitySchemes: { [scheme: string]: any };
    responses: { [response: string]: { description: string } };
  };
  security: any[];
  paths: SwaggerPaths;
}

function readFileContent(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

const { ip, port } = await getIpAddressAndFreePort();

const swagger: SwaggerSchema = {
  openapi: '3.1.1',
  info: JSON.parse(readFileSync(`${process.cwd()}/swagger.info.json`, 'utf8')),
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

  const routePattern: RegExp =
    /(\$app->\w+\(['"](?:\/[^'"]*)*['"]\s*,?\s*["'].*?["']\);)/g;

  const matches: RegExpMatchArray | null = routeContent.match(routePattern);

  try {
    if (matches) {
      const routeProcessing = matches.map(async route => {
        let method = (
          route.match(/\$\w+->(\w+)\(/) as RegExpMatchArray
        )[1]?.toLowerCase();
        let path: string = (route.match(/'\S*'/) as RegExpMatchArray)[0];
        path = path.substring(1, path.length - 1);

        if (
          !method ||
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

        const service = controller?.replace('Controller', 'Service');

        let parameters: SwaggerPathParameters[] = [];

        const matches: RegExpMatchArray | null = path.match(/{[^}]+}/g);

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

        if (!tag) {
          return;
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

        if (routeObj.method === 'get') {
          swagger.paths[routeObj.path]![routeObj.method] = {
            tags: [routeObj.tag],
            parameters: parameters,
            responses: {
              200: {
                description: 'OK',
              },
            },
          };
        } else {
          const requestBodySchema = await generateDtoSchema(
            controller!,
            routeObj.action!
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
            responses: {
              200: {
                description: 'OK',
              },
            },
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
