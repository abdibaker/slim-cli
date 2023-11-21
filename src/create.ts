#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import { createSpinner, Options } from 'nanospinner';
import figlet from 'figlet';
import gradient from 'gradient-string';

export function cloneGitHubRepository() {
  const repoUrl = 'https://github.com/abdibaker/slim-template.git';

  const cloneDir = 'creating'; // Temporary directory to clone into

  const child = exec(`git clone ${repoUrl} ${cloneDir}`);

  const spinner = createSpinner('Creating project...\n');

  if (child.stdout) {
    child.stdout.on('data', data => {
      console.log(data.toString());
    });
  }

  if (child.stderr) {
    child.stderr.on('data', () => {
      spinner.start();
    });
  }

  child.on('error', error => {
    console.error(`Error: ${error.message}`);
  });

  child.on('close', async code => {
    if (code === 0) {
      spinner.stop();
      chalkAnimation.rainbow('🚀 Installing dependencies...\n');
      fs.copySync(cloneDir, process.cwd());
      fs.removeSync(cloneDir);
      await installDependencies();
      addEnv();
      console.log(chalk.green('Dependencies installed.'));
      success();
    } else {
      console.error(chalk.red(`Failed to create Project with code ${code}`));
    }
  });
}

async function installDependencies() {
  return new Promise<void>(resolve => {
    exec('composer install', async (error, stdout, stderr) => {
      if (error) {
        console.error(
          chalk.red(`Error running composer install: ${error.message}`)
        );
        process.exit(0);
      }
      console.log(chalk.green('Dependencies installed.'));
      resolve();
    });
  });
}

function addEnv() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  fs.writeFileSync('.env', envExampleContent);

  fs.removeSync(envExamplePath);
  fs.removeSync(path.join(process.cwd(), '.git'));
}

async function success() {
  console.clear();
  const msg = `Successfully \n Created!.`;
  figlet(msg, (err: any, data: any) => {
    console.log(gradient.pastel.multiline(data));
  });
}
