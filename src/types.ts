export interface SwaggerPathParameters {
  name: string;
  in: string;
  required: boolean;
  schema: { type: string };
}

export interface SwaggerPathResponses {
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

export interface ResponseSchema {
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
