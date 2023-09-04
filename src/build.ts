import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { copy } from 'fs-extra'; // Import fs-extra for recursive directory copying

export async function buildApp() {
  const buildDirectory = 'build';

  try {
    // Create build directory if it doesn't exist
    await fs.mkdir(buildDirectory, { recursive: true });

    // Copy files and directories to the build directory
    await Promise.all([
      fs.copyFile('composer.json', `${buildDirectory}/composer.json`),
      fs.copyFile('composer.lock', `${buildDirectory}/composer.lock`),
      copy('./src', `${buildDirectory}/src`), // Use fs-extra's copy for recursive copy
      copy('./public', `${buildDirectory}/public`), // Use fs-extra's copy for recursive copy
    ]);

    // Change to the build directory
    process.chdir(buildDirectory);

    // Run composer install command
    exec(
      'composer install --no-dev --optimize-autoloader',
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error running composer install: ${(error as Error).message}`
          );
          return;
        }
        console.log(stdout);
        console.error(stderr);

        // Change back to the original directory
        process.chdir('..');
        console.log('Build completed.');
      }
    );
  } catch (error) {
    console.error(
      `Error building the application: ${(error as Error).message}`
    );
  }
}
