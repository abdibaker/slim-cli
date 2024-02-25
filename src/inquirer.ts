import chalk from 'chalk';
import inquirer from 'inquirer';
import inflection from 'inflection';

export async function getTableName(tableNameArg: string | undefined) {
  const tableName =
    tableNameArg ||
    (await inquirer.prompt([
      {
        type: 'input',
        name: 'tableName',
        message: 'Enter the name of the Table:',
      },
    ]));

  const parts = tableName.split(/[-_]/);
  const [potentialPrefix, ...rest] = parts;

  if (rest.length > 0) {
    const hasPrefix = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasPrefix',
        message: `Is ${chalk.hex('#f97316')(
          potentialPrefix
        )} the prefix of table ${chalk.hex('#f97316')(tableName)}?`,
      },
    ]);

    if (hasPrefix) {
      return {
        tableName,
        tableNameWithoutPrefix: rest.join('_'),
        hasPrefix: true,
      };
    }
  }

  return { tableName, tableNameWithoutPrefix: tableName, hasPrefix: false };
}

export async function getClassName(tableName: string) {
  const { className } = await inquirer.prompt([
    {
      type: 'input',
      name: 'className',
      message: `Enter Proper className for ${tableName}:`,
      default: `${inflection.classify(tableName)}`,
    },
  ]);
  return className;
}
