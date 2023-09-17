import path from 'path';
import { SWAGGER_FILE, TEMPLATE_PATH } from './CONST.js';
import { fileExists } from './helpers/fileExist.js';
import { replaceTemplatePlaceholders } from './helpers/replaceTemplatePlaceholders.js';
import { readFile, writeFile } from 'fs/promises';

interface props {
  routeName: string;
  className: string;
  primaryKey: string;
  primaryKeyType: any;
  selectedColumns: string;
  columnsToInsert: string;
  columnsToUpdate: string;
}

export async function updateSwaggerFile({
  routeName,
  className,
  primaryKey,
  primaryKeyType,
  selectedColumns,
  columnsToInsert,
  columnsToUpdate,
}: props) {
  if (!(await fileExists(SWAGGER_FILE))) {
    throw new Error('File "public/swagger/swagger.json" does not exist.');
  } else {
    const existingSwaggerContent = await readFile(SWAGGER_FILE, 'utf-8');
    const swaggerContentPath = path.join(
      TEMPLATE_PATH,
      'public',
      'swagger',
      'swagger.json'
    );
    const swaggerContent = await readFile(swaggerContentPath, 'utf-8');

    const newContent = replaceTemplatePlaceholders(swaggerContent, {
      className,
      routeName,
      primaryKey,
      primaryKeyType: JSON.stringify(primaryKeyType),
      selectedColumns,
      columnsToInsert,
      columnsToUpdate,
    });

    const existingContentLines = existingSwaggerContent.split('\n');
    const insertIndex = existingContentLines.length - 3;
    existingContentLines.splice(insertIndex, 0, newContent);
    const updatedContent = existingContentLines.join('\n');
    await writeFile(SWAGGER_FILE, updatedContent);
  }
}
