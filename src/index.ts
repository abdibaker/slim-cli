#!/usr/bin/env node
import os from "node:os";
import chalk from "chalk";
import { program } from "commander";
import { buildApp } from "./build.js";
import { cloneGitHubRepository } from "./create.js";
import { generateApi } from "./generateApi.js";
import startServer from "./startServer.js";
import { generateSwagger } from "./swaggerGenerator.js";

// Set version from package.json
program.version("0.4.0-beta", "-v, --version", "output the current version");

program
	.command("generate [tableName]")
	.alias("g")
	.description("Generate API endpoints for a database table")
	.action(async (tableName) => {
		try {
			const result = await generateApi(tableName);
			if (result?.success) {
				console.log(
					chalk.green(`API generated successfully for /${result.routeName}`),
				);
			}
			process.exit(0);
		} catch (error) {
			console.error(
				chalk.red(
					`Failed to generate API: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
			process.exit(1);
		}
	});

program
	.command("create")
	.alias("c")
	.description("Create a new Slim Framework project")
	.argument("<projectName>", "Name of the project to create")
	.action(async (projectName) => {
		try {
			await cloneGitHubRepository(projectName);
		} catch (error) {
			console.error(
				chalk.red(
					`Error creating project: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
			process.exit(1);
		}
	});

program
	.command("swagger")
	.alias("sw")
	.description("Generate Swagger/OpenAPI documentation")
	.action(async () => {
		try {
			await generateSwagger();
			process.exit(0);
		} catch (error) {
			console.error(
				chalk.red(
					`Failed to generate Swagger: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
			process.exit(1);
		}
	});

program
	.command("start")
	.description("Start development server")
	.action(async () => {
		try {
			await startServer();
		} catch (error) {
			console.error(
				chalk.red(
					`Failed to start server: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
			process.exit(1);
		}
	});

program
	.command("build")
	.description("Build the project for production")
	.option("--skip-composer", "Skip running composer install")
	.option("--verbose", "Display detailed output during build process")
	.option("--output <filename>", "Specify custom output zip filename")
	.action(async (options) => {
		try {
			await buildApp({
				skipComposer: options.skipComposer || false,
				verbose: options.verbose || false,
				outputZip: options.output,
			});
		} catch (error) {
			console.error(
				chalk.red(
					`Failed to build project: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
			process.exit(1);
		}
	});

// Add a default command when no command is specified
program.addHelpText(
	"afterAll",
	`
Examples:
  $ slim create my-project     Create a new Slim project named 'my-project'
  $ slim generate users        Generate API for the 'users' table
  $ slim swagger               Generate Swagger documentation
  $ slim start                 Start the development server
  $ slim build [options]       Build the project for production
    Options:
      --skip-composer          Skip running composer install
      --verbose                Display detailed output during build process
      --output <filename>      Specify custom output zip filename
    The build command will create a zip archive of your project in the current directory.
    The archive will contain the production-ready version of your application.
`,
);

// Handle unknown commands
program.on("command:*", () => {
	console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
	console.log(
		`See ${chalk.cyan("slim --help")} for a list of available commands.`,
	);
	process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length === 2) {
	program.help();
}

async function getIpAddressAndFreePort(): Promise<{
	ip: string;
	port: number;
}> {
	const os = require("node:os");
	const networkInterfaces = os.networkInterfaces();
	let ip = "";
	Object.keys(networkInterfaces).some((dev) => {
		networkInterfaces[dev].some((details: os.NetworkInterfaceInfo) => {
			if (details.family === "IPv4" && !details.internal) {
				ip = details.address;
				return true;
			}
		});
		return Boolean(ip);
	});

	const portfinder = require("portfinder");
	const port = await portfinder.getPortPromise();
	return { ip, port };
}
