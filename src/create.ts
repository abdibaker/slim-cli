#!/usr/bin/env node

import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import { exec } from 'child_process';
import figlet from 'figlet';
import fs from 'fs-extra';
import gradient from 'gradient-string';
import { createSpinner } from 'nanospinner';
import path from 'path';

export function cloneGitHubRepository(projectName: string) {
  const repoUrl = 'https://github.com/abdibaker/slim-template.git';

  const child = exec(`git clone ${repoUrl} ${projectName}`);

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
      fs.copySync(projectName, process.cwd());
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

  // fs.removeSync(envExamplePath);
  fs.removeSync(path.join(process.cwd(), '.git'));
}

async function success() {
  console.clear();
  const msg = `Successfully \n Created!.`;
  figlet(msg, (err: any, data: any) => {
    console.log(gradient.pastel.multiline(data));
  });
}
