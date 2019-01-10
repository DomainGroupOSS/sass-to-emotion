#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const fs = require('fs');
const path = require('path');
const transform = require('./transform');

(() => {
  const files = process.argv.slice(2);

  const processedFiles = files.map((filePath) => {
    const css = fs.readFileSync(filePath);

    console.log('Transforming:', filePath);
    const js = transform(css, filePath);

    return [filePath, js];
  });

  console.log('Processed all files without errors, writing to disk');

  processedFiles.forEach(([filePath, js]) => {
    const newFilePath = `${filePath.replace('/scss/', '/style/').split('.scss')[0]}.js`;
    fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
    fs.writeFileSync(newFilePath, js);
  });

  console.log('Finished successfully!');

  process.exit();
})();
