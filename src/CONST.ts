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

export const excludedFieldsArray = [
  'createdDate',
  'created_date',
  'createdAt',
  'create_at',
  'modified_date',
  'modifiedDate',
  'modified_at',
  'modifiedAt',
  'deleted_date',
  'deletedDate',
  'deleted_at',
  'deletedAt',
  'created_by',
  'createdBy',
  'modifiedBy',
  'deletedBy',
  'deleted_by',
  'createdByUserId',
  'created_by_user_id',
  'modifiedByUserId',
  'modified_by_user_id',
  'deletedByUserId',
  'deleted_by_user_id',
  'creationDate',
  'create_date',
  'modificationDate',
  'modification_date',
  'deletionDate',
  'deletion_date',
];
