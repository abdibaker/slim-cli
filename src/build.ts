import archiver from 'archiver';
import chalk from 'chalk';
import { exec as execCallback } from 'child_process';
import fs from 'fs';
import { access, copyFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { createSimpleSpinner } from './utils/simpleSpinner.js';

// Promisify exec for better async handling
const exec = promisify(execCallback);

/**
 * Interface for build options
 */
interface BuildOptions {
  skipComposer?: boolean;
  verbose?: boolean;
  outputZip?: string; // Optional custom zip filename
}

/**
 * Creates a zip archive using the archiver package
 * @param sourceDirs - Array of directories/files to include in the zip
 * @param outputPath - Path where zip file will be created
 * @param tempDir - Temporary directory where composer install was run
 * @returns Promise that resolves when zip is complete
 */
async function createZipWithArchiver(
  sourceDirs: { src: string; dest: string }[],
  outputPath: string,
  tempDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a file to stream archive data to
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level
    });

    // Listen for all archive data to be written
    output.on('close', () => {
      resolve();
    });

    // Good practice to catch warnings (e.g. stat failures and other non-blocking errors)
    archive.on('warning', err => {
      if (err.code === 'ENOENT') {
        console.warn(`Warning while creating archive: ${err.message}`);
      } else {
        reject(err);
      }
    });

    // Good practice to catch this error explicitly
    archive.on('error', err => {
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add each source directory/file to the archive
    for (const { src, dest } of sourceDirs) {
      const fullSrcPath = path.join(tempDir, src);
      const stats = fs.statSync(fullSrcPath);

      if (stats.isDirectory()) {
        // Add directory contents to zip
        archive.directory(fullSrcPath, dest);
      } else {
        // Add file to zip
        archive.file(fullSrcPath, { name: dest });
      }
    }

    // Finalize the archive (i.e. we are done appending files)
    archive.finalize();
  });
}

/**
 * Checks if the zip command is available on the system
 * @returns Promise that resolves to a boolean indicating if zip is available
 */
async function isZipCommandAvailable(): Promise<boolean> {
  try {
    await exec('which zip');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Recursively copy a directory
 * @param src - Source directory
 * @param dest - Destination directory
 */
async function copyDir(src: string, dest: string): Promise<void> {
  // Create destination directory if it doesn't exist
  await mkdir(dest, { recursive: true });

  // Read the contents of the source directory
  const entries = fs.readdirSync(src);

  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);

    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      // Recursively copy subdirectories
      await copyDir(srcPath, destPath);
    } else {
      // Copy files
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Check if a path exists
 * @param filePath - Path to check
 * @returns Promise that resolves to a boolean indicating if path exists
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the application for production deployment and creates a zip archive
 * @param options - Build configuration options
 * @returns Promise that resolves when build is complete
 */
export async function buildApp(options: BuildOptions = {}): Promise<void> {
  const { skipComposer = false, verbose = false, outputZip } = options;
  const cwd = process.cwd();
  const tempDirectory = path.join(cwd, '.temp-build');
  const zipFileName = outputZip || 'build.zip';
  const zipFilePath = path.join(cwd, zipFileName);

  // Create a spinner for non-verbose mode
  let spinner = verbose ? null : createSimpleSpinner('Building application...');

  if (!verbose) {
    spinner?.start();
  }

  try {
    if (verbose) {
      console.log(chalk.blue('🔨 Starting build process...'));
    }

    // Create temp directory if it doesn't exist
    await mkdir(tempDirectory, { recursive: true });

    // Copy files and directories to the temp directory
    if (verbose) {
      console.log(chalk.blue('📁 Preparing files for build...'));
    }

    await Promise.all([
      copyFile(
        path.join(cwd, 'composer.json'),
        path.join(tempDirectory, 'composer.json')
      ),
      copyFile(
        path.join(cwd, 'composer.lock'),
        path.join(tempDirectory, 'composer.lock')
      ),
      copyFile(
        path.join(cwd, '.env.example'),
        path.join(tempDirectory, '.env')
      ),
      copyFile(
        path.join(cwd, '.htaccess'),
        path.join(tempDirectory, '.htaccess')
      ),
      copyDir(path.join(cwd, 'src'), path.join(tempDirectory, 'src')),
      copyDir(path.join(cwd, 'public'), path.join(tempDirectory, 'public')),
    ]);

    // Change to the temp directory
    process.chdir(tempDirectory);

    // Run composer install command if not skipped
    if (!skipComposer) {
      if (verbose) {
        console.log(chalk.blue('📦 Running composer install...'));
      } else {
        spinner?.stop();
        spinner = createSimpleSpinner('Running composer install...').start();
      }

      try {
        const { stdout, stderr } = await exec(
          'composer install --no-dev --optimize-autoloader'
        );

        if (verbose && stdout) {
          console.log(stdout);
        }

        if (stderr && verbose) {
          console.error(chalk.yellow('⚠️ Composer warnings:'), stderr);
        }
      } catch (error) {
        if (!verbose) {
          spinner?.error({ text: 'Failed to run composer install' });
        }
        throw new Error(
          `Failed to run composer install: ${(error as Error).message}`
        );
      }
    }

    // Delete unnecessary files
    if (verbose) {
      console.log(chalk.blue('🧹 Cleaning up unnecessary files...'));
    } else {
      spinner?.stop();
      spinner = createSimpleSpinner('Cleaning up unnecessary files...').start();
    }

    await Promise.all([
      rm(path.join(tempDirectory, 'composer.json'), { force: true }),
      rm(path.join(tempDirectory, 'composer.lock'), { force: true }),
      pathExists(path.join(tempDirectory, 'public/local.php')).then(exists =>
        exists
          ? rm(path.join(tempDirectory, 'public/local.php'), { force: true })
          : Promise.resolve()
      ),
    ]);

    // Change back to the original directory
    process.chdir(cwd);

    // Create zip archive with files directly at the root
    if (verbose) {
      console.log(chalk.blue(`📦 Creating zip archive: ${zipFileName}...`));
    } else {
      spinner?.stop();
      spinner = createSimpleSpinner(
        `Creating zip archive: ${zipFileName}...`
      ).start();
    }

    // Remove existing zip file if it exists
    if (await pathExists(zipFilePath)) {
      await rm(zipFilePath, { force: true });
    }

    try {
      // Define files and directories to include in the zip
      const filesToZip = [
        { src: 'src', dest: 'src' },
        { src: 'public', dest: 'public' },
        { src: 'vendor', dest: 'vendor' },
        { src: '.htaccess', dest: '.htaccess' },
      ];

      // Check if zip command is available, otherwise use archiver
      const hasZipCommand = await isZipCommandAvailable();

      if (hasZipCommand) {
        // Use system's zip command to create the archive
        process.chdir(tempDirectory);
        await exec(`zip -r "${path.join(cwd, zipFileName)}" ./* ./.htaccess`);
        process.chdir(cwd);
      } else {
        // Use archiver as fallback
        if (verbose) {
          console.log(
            chalk.blue('Using Node.js archiver as zip command is not available')
          );
        }
        await createZipWithArchiver(filesToZip, zipFilePath, tempDirectory);
      }

      // Clean up the temp directory after successful zip creation
      await rm(tempDirectory, { recursive: true, force: true });

      if (verbose) {
        console.log(
          chalk.green(
            `✅ Build completed successfully! Archive created at: ${zipFileName}`
          )
        );
      } else {
        spinner?.success({
          text: `Build completed successfully! Archive created at: ${zipFileName}`,
        });
      }
    } catch (error) {
      if (verbose) {
        console.error(
          chalk.red(`Failed to create zip archive: ${(error as Error).message}`)
        );
      } else {
        spinner?.error({
          text: `Failed to create zip archive: ${(error as Error).message}`,
        });
      }
      throw new Error(
        `Failed to create zip archive: ${(error as Error).message}`
      );
    }
  } catch (error) {
    // Change back to original directory in case of error
    if (process.cwd() !== cwd) {
      process.chdir(cwd);
    }

    // Clean up temp directory if it exists
    if (await pathExists(tempDirectory)) {
      await rm(tempDirectory, { recursive: true, force: true });
    }

    if (verbose) {
      console.error(
        chalk.red(
          `❌ Error building the application: ${(error as Error).message}`
        )
      );
    } else {
      spinner?.error({
        text: `Error building the application: ${(error as Error).message}`,
      });
    }

    throw error; // Re-throw to allow caller to handle the error
  }
}

/**
 * Utility function to check if the build directory exists
 * @returns Promise that resolves to a boolean indicating if build directory exists
 */
export async function buildDirectoryExists(): Promise<boolean> {
  const buildDirectory = path.join(process.cwd(), 'build');
  return pathExists(buildDirectory);
}
