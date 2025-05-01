import { readFileSync } from 'node:fs';
import { getServicePath } from '../CONST.js';
import type { ResponseSchema, SwaggerPathResponses } from '../types.js';

/**
 * Extracts the returned data from a controller function and returns a Swagger response schema.
 * @param controllerName The name of the controller file
 * @param functionName The name of the function to analyze
 * @returns A Swagger response schema object
 */
export async function extractReturnedData(
  controllerName: string,
  functionName: string
): Promise<SwaggerPathResponses> {
  try {
    // Get the service file path
    const servicePath = getServicePath(controllerName);

    // Read the service file
    let phpCode = '';
    try {
      phpCode = readFileSync(servicePath, 'utf8');
    } catch (err) {
      return {
        200: {
          description: 'Read the service file error',
        },
      };
    }

    // Extract the function content
    let functionContent = '';
    const functionStartRegex = new RegExp(
      `public\\s+function\\s+${functionName}\\s*\\([^{]*\\{`,
      'i'
    );
    const startMatch = functionStartRegex.exec(phpCode);

    if (startMatch) {
      const startIndex = startMatch.index;
      let braceCount = 1;
      let currentIndex = startIndex + startMatch[0].length;

      while (braceCount > 0 && currentIndex < phpCode.length) {
        const char = phpCode[currentIndex];
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        currentIndex++;
      }

      if (braceCount === 0) {
        functionContent = phpCode.substring(startIndex, currentIndex);
      }
    }

    if (!functionContent) {
      return {
        200: {
          description: 'Extract the function content error',
        },
      };
    }

    // Look for SQL queries
    const sqlRegex = /<<<SQL\s*\n([\s\S]*?)\n\s*SQL\s*;/g;
    const sqlMatches = functionContent.match(sqlRegex);

    if (!sqlMatches) {
      return {
        200: {
          description: 'No SQL queries found',
        },
      };
    }

    // Analyze the SQL query to determine the response structure
    const sqlQuery = sqlMatches[0].replace(/<<<SQL\s*\n|SQL\s*;/g, '');

    // Check if it's a single row or multiple rows query based on database methods
    const isSingleRow =
      functionContent.includes('fetchAssociative') ||
      functionContent.includes('fetchOne') ||
      functionContent.includes('fetchAssoc');

    // Extract column names from SELECT statements
    const selectRegex = /SELECT\s+([\s\S]*?)\s+FROM/i;
    const selectMatch = sqlQuery.match(selectRegex);

    if (!selectMatch || !selectMatch[1]) {
      return {
        200: {
          description: 'No SELECT statement found',
        },
      };
    }

    const columns = selectMatch[1]
      .split(',')
      .map(col => col.trim())
      .map(col => {
        // Handle aliased columns
        const aliasMatch = col.match(/AS\s+`?(\w+)`?$/i);
        return aliasMatch ? aliasMatch[1] : col.replace(/`/g, '');
      });

    // Create column properties
    const columnProperties: {
      [key: string]: { type: string; description: string };
    } = {};
    for (const column of columns) {
      columnProperties[column as string] = {
        type: 'string',
        description: `The ${column} field`,
      };
    }

    // Create the response schema based on query type
    const responseSchema: ResponseSchema = isSingleRow
      ? {
          type: 'object',
          properties: columnProperties,
        }
      : {
          type: 'array',
          items: {
            type: 'object',
            properties: columnProperties,
          },
        };

    return {
      200: {
        description: isSingleRow
          ? 'Single object response'
          : 'Array of objects response',
        content: {
          'application/json': {
            schema: responseSchema,
          },
        },
      },
    };
  } catch (error) {
    // Return default response on error
    return {
      200: {
        description: 'Extract the returned data error',
      },
    };
  }
}
