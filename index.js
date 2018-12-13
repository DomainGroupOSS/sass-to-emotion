#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const fs = require('fs').promises;
const transform = require('./transform');

(async () => {
  const files = process.argv.slice(2);

  const transformFiles = files.map(async (filePath) => {
    const fileString = await fs.readFile(filePath);

    const css = await transform(fileString, filePath);

    await fs.writeFile(filePath, css);
  });


  await Promise.all(transformFiles);

  console.log('Finished successfully!');
  process.exit();
})();
