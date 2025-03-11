import { generateSwagger } from './swaggerGenerator.js';
import { execSync } from 'child_process';
import getIpAddressAndFreePort from './utils/getIpAndFreePort.js';
import chalk from 'chalk';

export default async function startServer() {
  const { ip, port } = await getIpAddressAndFreePort();

  await generateSwagger();

  console.log(
    chalk.green('[Info]') +
      ` PHP Development server started at ${chalk.cyan(`http://${ip}:${port}`)}`
  );
  console.log(
    chalk.green('[Info]') +
      ' Press ' +
      chalk.yellow('Ctrl+C') +
      ' to stop the server'
  );

  try {
    execSync(`php -S ${ip}:${port} -t public public/local.php`, {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error(chalk.red('[Error]') + ' Failed to start PHP server:', error);
    process.exit(1);
  }
}
