import path from 'path';
import { SRC_DIR, TEMPLATE_PATH } from './CONST.js';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { fileExists } from './helpers/fileExist.js';
import { replaceTemplatePlaceholders } from './helpers/replaceTemplatePlaceholders.js';

interface props {
  className: string;
  tableName: string;
  primaryKey: string;
  primaryKeyType: any;
  classNameLowFirst?: string;
  columnsToSelect: string;
}

export async function createComponent(
  type: 'Service' | 'Controller',
  {
    className,
    tableName,
    primaryKey,
    primaryKeyType,
    classNameLowFirst,
    columnsToSelect,
  }: props
) {
  const componentDir = path.join(SRC_DIR, type);
  const componentPath = path.join(componentDir, `${className}${type}.php`);
  const templatePath = path.join(TEMPLATE_PATH, type, 'base.php');

  await mkdir(componentDir, { recursive: true });

  if (await fileExists(componentPath)) {
    throw new Error(`Endpoint "/${classNameLowFirst}" already exists.`);
  } else {
    const templateContent = await readFile(templatePath, 'utf-8');
    const replacedContent = replaceTemplatePlaceholders(templateContent, {
      tableName,
      primaryKey: primaryKey,
      primaryKeyType: primaryKeyType.type === 'integer' ? 'int' : 'string',
      className,
      classNameLowFirst,
      columnsToSelect,
    });

    await writeFile(componentPath, replacedContent);
  }
}
