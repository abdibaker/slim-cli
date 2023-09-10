import chalk from 'chalk';
import inquirer from 'inquirer';
import inflection from 'inflection';

async function getTableName() {
  const { tableName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'tableName',
      message: 'Enter the name of the Table:',
    },
  ]);

  const [prefix, tableNameWithoutPrefix] = tableName.split(/[-_]/);

  if (tableNameWithoutPrefix) {
    const { hasPrefix } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasPrefix',
        message: `Is ${chalk.hex('#f97316')(
          prefix
        )} the prefix of table ${chalk.hex('#f97316')(tableName)} ?`,
      },
    ]);

    if (hasPrefix) {
      return { tableName, tableNameWithoutPrefix };
    }
  }

  return { tableName, tableNameWithoutPrefix: tableName };
}

async function getClassName(tableName: string) {
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

const { tableName, tableNameWithoutPrefix } = await getTableName();
const className = await getClassName(tableNameWithoutPrefix);

export { tableName, className };
