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

    if (!js) return null;

    return [filePath, js];
  }).filter(Boolean);

  console.log('Processed all files without errors, writing to disk');

  processedFiles.forEach(([filePath, js]) => {
    const newFilePath = filePath.replace('/scss/', '/style/').replace('.scss', '.js');
    const filenewFilePathDir = path.dirname(newFilePath);
    const filenewFilePathBase = path.basename(newFilePath);

    // remove the Sass underscore _ (what a silly design decision)
    const finalFilePath = path.join(filenewFilePathDir, filenewFilePathBase.replace('_', ''));

    fs.mkdirSync(filenewFilePathDir, { recursive: true });
    fs.writeFileSync(finalFilePath, js);
  });

  console.log('Finished successfully!');

  process.exit();
})();
