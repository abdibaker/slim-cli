import path from 'path';
import { SERVICES_FILE, TEMPLATE_PATH } from './CONST.js';
import { fileExists } from './helpers/fileExist.js';
import { replaceTemplatePlaceholders } from './helpers/replaceTemplatePlaceholders.js';
import { readFile, writeFile } from 'fs/promises';

interface props {
  classNameLowFirst: string;
  className: string;
  primaryKey: string;
}

export async function updateServicesFile({
  classNameLowFirst,
  className,
  primaryKey,
}: props) {
  if (!(await fileExists(SERVICES_FILE))) {
    throw new Error('File "App/Services.php" does not exist.');
  } else {
    const existingServiceContent = await readFile(SERVICES_FILE, 'utf-8');
    const serviceContentPath = path.join(TEMPLATE_PATH, 'App', 'Services.php');
    const ServiceContent = await readFile(serviceContentPath, 'utf-8');

    const newContent = replaceTemplatePlaceholders(ServiceContent, {
      classNameLowFirst,
      className,
      primaryKey,
    });
    const updatedContent = existingServiceContent + '\n' + newContent;

    await writeFile(SERVICES_FILE, updatedContent);
  }
}
