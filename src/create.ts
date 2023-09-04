#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs-extra'; // Import fs-extra
import path from 'path';

const templateDir = path.join(
  new URL('../src/template/project', import.meta.url).pathname
);
const currentWorkingDir = process.cwd();

export async function copyTemplate() {
  try {
    await fs.copy(templateDir, currentWorkingDir); // Use fs-extra's copy function
    installDependencies();
  } catch (error) {
    console.error('Error copying template:', error);
  }
}

function installDependencies() {
  exec('composer install', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running composer install: ${error.message}`);
      return;
    }
    console.log(stdout);
    console.error(stderr);
    console.log('Project created. Run `composer start` to start the server.');
  });
}
