import { accessSync } from "node:fs";

export async function fileExists(filePath: string) {
	try {
		accessSync(filePath);
		return true;
	} catch (error) {
		return false;
	}
}
