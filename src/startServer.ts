export default function startServer(): void {
  const { SERVE_HOST, SERVE_PORT } = process.env;
  const { spawn } = require('child_process');

  const server = spawn('php', [
    '-S',
    `${SERVE_HOST}:${SERVE_PORT}`,
    '-t',
    'public',
    'public/index.php',
  ]);

  server.stdout.on('data', (data: Buffer) => {
    const output = data.toString();
    if (
      output.toLowerCase().includes('error') ||
      output.toLowerCase().includes('warning')
    ) {
      console.log(`Server output: ${output}`);
    }
  });

  server.stderr.on('data', (data: Buffer) => {
    console.error(`Server error: ${data.toString()}`);
  });

  server.on('close', (code: number) => {
    if (code !== 0) {
      console.log(`Server exited with code ${code}`);
    }
  });

  console.log(`PHP server started at http://${SERVE_HOST}:${SERVE_PORT}`);
}
