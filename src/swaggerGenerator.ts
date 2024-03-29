import { readFileSync, writeFileSync } from 'fs';
import { ROUTES_FILE } from './CONST.js';
import { generateDtoSchema } from './generateDtoSchema.js';

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
    summary?: string;
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

const swagger: SwaggerSchema = {
  openapi: '3.0.3',
  info: {
    title: 'Swagger',
    version: '1.0.0',
    description: '',
    contact: {
      email: 'abdibaker1@gmail.com',
      name: '',
      url: 'http://127.0.0.1:8080',
    },
  },
  servers: [{ url: 'http://127.0.0.1:8080', description: 'Local server' }],
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
          path === '/' ||
          path === '/api' ||
          path === '/status' ||
          path === '/swagger-ui'
        ) {
          return;
        }

        if (!method) {
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
          parameters = matches.map(match => ({
            name: match.substring(1, match.length - 1),
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          }));
        }

        if (!tag) {
          return;
        }

        const formattedTag: string = tag[0]?.toUpperCase() + tag.slice(1);
        const routeObj = {
          path: `/${tag}s${path}`,
          method,
          controller,
          tag: formattedTag,
          action,
          parameters: JSON.stringify(parameters),
        };

        if (!swagger.paths[routeObj.path]) {
          swagger.paths[routeObj.path] = {};
        }

        if (routeObj.method === 'get') {
          swagger.paths[routeObj.path]![routeObj.method] = {
            tags: [routeObj.tag],
            summary: routeObj.action,
            parameters: parameters,
            responses: {
              200: {
                description: 'OK',
                // content: {
                //   'application/json': {
                //     schema: {
                //       type: 'array',
                //       items: {
                //         type: 'object',
                //         properties: {
                //           user_id: {
                //             type: 'integer',
                //           },
                //         },
                //       },
                //     },
                //   },
                // },
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
            summary: routeObj.action,
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
    process.exit(0);
  } catch (error) {
    console.error('An error occurred:', (error as Error).message);
    process.exit(1);
  }
}
