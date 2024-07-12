#!/usr/bin/env node

import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import { exec } from 'child_process';
import figlet from 'figlet';
import fs from 'fs-extra';
import gradient from 'gradient-string';
import { createSpinner } from 'nanospinner';
import path from 'path';

export function cloneGitHubRepository(projectName: string): Promise<void> {
  return new Promise((resolve, reject) => {
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
      reject(error);
    });

    child.on('close', async code => {
      if (code === 0) {
        spinner.stop();
        chalkAnimation.rainbow('🚀 Installing dependencies...\n');
        try {
          await installDependencies(projectName);
          addEnv(projectName);
          console.log(chalk.green('Dependencies installed.'));
          await success();
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        console.error(chalk.red(`Failed to create Project with code ${code}`));
        reject(new Error(`Failed to create Project with code ${code}`));
      }
    });
  });
}

async function installDependencies(projectName: string) {
  return new Promise<void>((resolve, reject) => {
    exec(
      `cd ${projectName} && composer install && npm install`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            chalk.red(
              `Error running dependencies installation: ${error.message}`
            )
          );
          process.exit(1);
        }
        console.log(chalk.green('Dependencies installed.'));
        resolve();
      }
    );
  });
}

function addEnv(projectName: string) {
  const envExamplePath = path.join(
    process.cwd(),
    `${projectName}/.env.example`
  );
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  fs.writeFileSync(`${projectName}/.env`, envExampleContent);

  // fs.removeSync(envExamplePath);
  fs.removeSync(path.join(process.cwd(), `${projectName}/.git`));
}

async function success() {
  console.clear();
  const msg = `Successfully \n Created!.`;
  figlet(msg, (err: any, data: any) => {
    console.log(gradient.pastel.multiline(data));
  });
}
