import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';

const sleep = (ms = 2000) => new Promise(resolve => setTimeout(resolve, ms));

export async function welcome() {
  const welcomeText = chalkAnimation.rainbow('Welcome to the Slim CLI! \n');

  await sleep();

  console.log(
    'This CLI will help you generate a REST API with Slim Framework 4 and Eloquent ORM.'
  );
}
