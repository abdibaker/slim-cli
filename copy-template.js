import fs from 'fs/promises';

fs.cp('./src/template', './dist/template', { recursive: true }, (err) => {
  if (err) {
    console.error(err);
  }
});