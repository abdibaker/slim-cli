#!/usr/bin/env node

import chalk from 'chalk';
import { exec } from 'child_process';
import figlet from 'figlet';
import fs from 'fs-extra';
import gradient from 'gradient-string';
import { createSpinner } from 'nanospinner';
import path from 'path';

export function cloneGitHubRepository(projectName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const repoUrl = 'https://github.com/abdibaker/slim-template.git';
    const spinner = createSpinner('Creating project...').start();

    const child = exec(`git clone ${repoUrl} ${projectName}`);

    if (child.stdout) {
      child.stdout.on('data', data => {
        // Silent output for cleaner experience
      });
    }

    if (child.stderr) {
      child.stderr.on('data', data => {
        if (data.toString().includes('error')) {
          spinner.error({ text: `Error: ${data.toString()}` });
        }
      });
    }

    child.on('error', error => {
      spinner.error({ text: `Error: ${error.message}` });
      reject(error);
    });

    child.on('close', async code => {
      if (code === 0) {
        spinner.success({ text: 'Project created successfully!' });
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
  const spinner = createSpinner('Installing dependencies...').start();

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
        spinner.success({ text: 'Dependencies installed successfully!' });
        resolve();
      }
    );
  });
}

function addEnv(projectName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const envExamplePath = path.join(
        process.cwd(),
        `${projectName}/.env.example`
      );
      const envPath = path.join(process.cwd(), `${projectName}/.env`);

      // Check if the file exists before attempting to read it
      if (!fs.existsSync(envExamplePath)) {
        throw new Error('.env.example file not found');
      }

      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
      fs.writeFileSync(envPath, envExampleContent);

      // Remove git directory to start fresh
      const gitDir = path.join(process.cwd(), `${projectName}/.git`);
      if (fs.existsSync(gitDir)) {
        fs.removeSync(gitDir);
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function success() {
  console.clear();
  const msg = `Successfully \n Created!`;
  figlet(msg, (err: any, data: any) => {
    if (err) {
      console.error('Something went wrong with figlet');
      console.error(err);
      return;
    }
    console.log(gradient.pastel.multiline(data));
    console.log(chalk.green('\nYour project is ready to use!'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white('1. cd into your project directory'));
    console.log(chalk.white('2. Configure your .env file'));
    console.log(chalk.white('3. Run the project with composer start'));
  });
}
