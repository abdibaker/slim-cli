#!/usr/bin/env node

import { exec } from "node:child_process";
import fs from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { createSimpleSpinner } from "./utils/simpleSpinner.js";

export function cloneGitHubRepository(projectName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const repoUrl = "https://github.com/abdibaker/slim-template.git";
		const spinner = createSimpleSpinner("Creating project...").start();

		const child = exec(`git clone ${repoUrl} ${projectName}`);

		if (child.stdout) {
			child.stdout.on("data", (data) => {
				// Silent output for cleaner experience
			});
		}

		if (child.stderr) {
			child.stderr.on("data", (data) => {
				if (data.toString().includes("error")) {
					spinner.error({ text: `Error: ${data.toString()}` });
				}
			});
		}

		child.on("error", (error) => {
			spinner.error({ text: `Error: ${error.message}` });
			reject(error);
		});

		child.on("close", async (code) => {
			if (code === 0) {
				spinner.success({ text: "Project created successfully!" });
				try {
					await setupProject(projectName);
					resolve();
				} catch (error) {
					reject(error);
				}
			} else {
				spinner.error({ text: `Failed to create project with code ${code}` });
				reject(new Error(`Failed to create project with code ${code}`));
			}
		});
	});
}

async function setupProject(projectName: string) {
	try {
		await addEnv(projectName);
		await installDependencies(projectName);
		await success();
	} catch (error) {
		console.error(chalk.red(`Setup failed: ${(error as Error).message}`));
		throw error;
	}
}

async function installDependencies(projectName: string): Promise<void> {
	const spinner = createSimpleSpinner("Installing dependencies...").start();

	return new Promise<void>((resolve, reject) => {
		exec(
			`cd ${projectName} && composer install && npm install`,
			(error, stdout, stderr) => {
				if (error) {
					spinner.error({
						text: `Dependencies installation failed: ${error.message}`,
					});
					reject(error);
					return;
				}
				spinner.success({ text: "Dependencies installed successfully!" });
				resolve();
			},
		);
	});
}

async function addEnv(projectName: string): Promise<void> {
	const envExamplePath = path.join(
		process.cwd(),
		`${projectName}/.env.example`,
	);
	const envPath = path.join(process.cwd(), `${projectName}/.env`);

	// Check if the file exists before attempting to read it
	try {
		await fs.promises.access(envExamplePath, fs.constants.R_OK);
	} catch (error) {
		throw new Error(".env.example file not found");
	}

	const envExampleContent = await readFile(envExamplePath, "utf8");
	await writeFile(envPath, envExampleContent);

	// Remove git directory to start fresh
	const gitDir = path.join(process.cwd(), `${projectName}/.git`);
	try {
		await fs.promises.access(gitDir, fs.constants.F_OK);
		await rm(gitDir, { recursive: true, force: true });
	} catch (error) {
		// Git directory doesn't exist, no need to remove
	}
}

async function success() {
	console.clear();
	console.log(chalk.green.bold("\n================================="));
	console.log(chalk.green.bold("  Project Successfully Created!  "));
	console.log(chalk.green.bold("=================================\n"));

	console.log(chalk.green("\nYour project is ready to use!"));
	console.log(chalk.cyan("Next steps:"));
	console.log(chalk.white("1. cd into your project directory"));
	console.log(chalk.white("2. Configure your .env file"));
	console.log(chalk.white("3. Run the project with slim start"));
}
