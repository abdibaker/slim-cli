import { rm, cp } from 'fs/promises';

await rm('./dist', { recursive: true, force: true });
await cp('./templates', './dist/templates', { recursive: true });
