import chalk from 'chalk';

export class SimpleSpinner {
  private message: string;
  private interval: NodeJS.Timeout | null = null;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;
  private isSpinning = false;

  constructor(message: string) {
    this.message = message;
  }

  start(): SimpleSpinner {
    if (this.isSpinning) return this;

    this.isSpinning = true;
    process.stdout.write('\x1B[?25l'); // Hide cursor

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);

    return this;
  }

  stop(): void {
    if (!this.isSpinning) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write('\r\x1B[K'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
    this.isSpinning = false;
  }

  success({ text }: { text: string }): void {
    this.stop();
    console.log(`${chalk.green('✓')} ${text}`);
  }

  error({ text }: { text: string }): void {
    this.stop();
    console.log(`${chalk.red('✗')} ${text}`);
  }

  warning({ text }: { text: string }): void {
    this.stop();
    console.log(`${chalk.yellow('⚠')} ${text}`);
  }

  info({ text }: { text: string }): void {
    this.stop();
    console.log(`${chalk.blue('ℹ')} ${text}`);
  }
}

export function createSimpleSpinner(message: string): SimpleSpinner {
  return new SimpleSpinner(message);
}
