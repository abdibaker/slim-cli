export default async function getIpAddressAndFreePort() {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let ip = '127.0.0.1';

  for (const dev in networkInterfaces) {
    for (const details of networkInterfaces[dev]) {
      if (details.family === 'IPv4' && !details.internal) {
        ip = details.address;
        break;
      }
    }
    if (ip !== '127.0.0.1') break;
  }

  const portfinder = require('portfinder');
  const port = await portfinder.getPortPromise();
  return { ip, port };
}
