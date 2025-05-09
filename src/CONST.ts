import path from "node:path";
import inflection from "inflection";
export const PUBLIC_DIR = path.join(process.cwd(), "public");
export const SRC_DIR = path.join(process.cwd(), "src");
export const TEMPLATE_PATH = path.join(
	new URL(".", import.meta.url).pathname,
	"templates",
);
export const ROUTES_FILE = path.join(SRC_DIR, "App", "Routes.php");
export const SERVICES_FILE = path.join(SRC_DIR, "App", "Services.php");
export const SWAGGER_FILE = path.join(PUBLIC_DIR, "swagger", "swagger.json");
export const SERVICES_DIR = path.join(SRC_DIR, "Service");
export const CONTROLLERS_DIR = path.join(SRC_DIR, "Controller");
export function getServicePath(controllerName: string) {
	return path.join(
		SERVICES_DIR,
		`${inflection.classify(
			controllerName.replace(".php", "").replace("Controller", ""),
		)}Service.php`,
	);
}
export function getControllerPath(controllerName: string) {
	return path.join(
		CONTROLLERS_DIR,
		`${inflection.classify(
			controllerName.replace(".php", "").replace("Controller", ""),
		)}Controller.php`,
	);
}
export const excludedFields = [
	"create_at",
	"create_date",
	"createdAt",
	"created_at",
	"createdBy",
	"created_by",
	"createdByUser",
	"created_by_user",
	"createdByUserId",
	"created_by_user_id",
	"createdDate",
	"created_date",
	"creationDate",
	"creation_date",
	"deleted_at",
	"deleted_at",
	"deletedBy",
	"deleted_by",
	"deletedByUser",
	"deleted_by_user",
	"deletedByUserId",
	"deleted_by_user_id",
	"deletedDate",
	"deleted_date",
	"deletionDate",
	"deletion_date",
	"lastModifiedDate",
	"last_modified_date",
	"modificationDate",
	"modification_date",
	"modifiedAt",
	"modified_at",
	"modifiedBy",
	"modified_by",
	"modifiedByUser",
	"modified_by_user",
	"modifiedByUserId",
	"modified_by_user_id",
	"modifiedDate",
	"modified_date",
	"recordCreationDate",
	"record_creation_date",
	"removedDate",
	"removed_date",
	"updatedAt",
	"updated_at",
	"user_created_at",
	"user_created_date",
	"userCreationDate",
	"user_creation_date",
	"userCreationDateId",
	"user_creation_date_id",
	"userDeletedByUserId",
	"user_deleted_by_user_id",
	"userDeletionDate",
	"user_deletion_date",
	"userModifiedByUserId",
	"user_modified_by_user_id",
	"userModificationDate",
	"user_modification_date",
];

export const updatedAtFieldArray = [
	"lastModifiedDate",
	"last_modified_date",
	"modificationDate",
	"modification_date",
	"modifiedAt",
	"modified_at",
	"modifiedDate",
	"modified_date",
	"updatedAt",
	"updated_at",
];
