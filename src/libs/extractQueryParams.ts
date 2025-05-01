import { readFileSync } from 'node:fs';
import { getControllerPath } from '../CONST.js';
import type { SwaggerPathParameters } from '../types.js';

/**
 * Extracts query parameters from a controller function.
 * Looks for patterns like $request->getQueryParams()['paramName']
 * @param controllerName The name of the controller file
 * @param functionName The name of the function to analyze
 * @returns Array of query parameter objects for Swagger
 */
export async function extractQueryParams(
  controllerName: string,
  functionName: string
): Promise<SwaggerPathParameters[]> {
  try {
    // Ensure both parameters are defined before proceeding
    if (!controllerName || !functionName) {
      return [];
    }

    // Read the controller file
    const controllerPath = getControllerPath(controllerName);

    let phpCode = '';
    try {
      phpCode = readFileSync(controllerPath, 'utf8');
    } catch (err) {
      // If we can't read the file, return empty array
      return [];
    }

    // Extract the function content - use a more flexible regex pattern
    // This pattern looks for a function with the given name and captures everything until the closing brace
    // It handles nested braces properly by counting them
    let functionContent = '';
    const functionStartRegex = new RegExp(
      `public\\s+function\\s+${functionName}\\s*\\([^{]*\\{`,
      'i'
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
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
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
        if (!queryParams.some(param => param.name === paramName)) {
          queryParams.push({
            name: paramName,
            in: 'query',
            required: false, // Query params are typically optional
            schema: { type: 'string' }, // Default to string type
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
        if (!queryParams.some(param => param.name === paramName)) {
          queryParams.push({
            name: paramName,
            in: 'query',
            required: false,
            schema: { type: 'string' },
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
