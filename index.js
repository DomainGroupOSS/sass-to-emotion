#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const fs = require('fs').promises;
const transform = require('./transform');

(async () => {
  const files = process.argv.slice(2);

  const transformFiles = files.map(async (filePath) => {
    const css = await fs.readFile(filePath);

    const js = await transform(css, filePath);
    console.log('filePath:', filePath);
    await fs.writeFile(`${filePath.split('.scss')[0]}.js`, js);
  });


  await Promise.all(transformFiles);

  console.log('Finished successfully!');

  process.exit();
})();
