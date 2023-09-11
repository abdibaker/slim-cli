import path from 'path';

export const PUBLIC_DIR = path.join(process.cwd(), 'public');
export const SRC_DIR = path.join(process.cwd(), 'src');
export const TEMPLATE_PATH = path.join(
  new URL('.', import.meta.url).pathname,
  'templates'
);
export const ROUTES_FILE = path.join(SRC_DIR, 'App', 'Routes.php');
export const SERVICES_FILE = path.join(SRC_DIR, 'App', 'Services.php');
export const SWAGGER_FILE = path.join(PUBLIC_DIR, 'swagger', 'swagger.json');
