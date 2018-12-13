#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const postcss = require('postcss');
const postcssScss = require('postcss-scss');
const fs = require('fs');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const { camelCase } = require('lodash');

const noSassplugin = postcss.plugin('no-sass', () => (root) => {
  root.walkRules((rule) => {
    // .email-share__form-group => .formGroup
    const [prefix, postfix] = rule.selector.split('__');
    rule.selector = `.${camelCase(postfix || prefix)}`;

    rule.walkDecls((decl) => {
      console.log('decl.prop:', decl.prop);
      // color: $fe-brary-colour-neutral-400; => color: var(--fe-brary-colour-neutral-400);
      if (decl.value[0] === '$') {
        decl.value = `var(--${decl.value.slice(1)})`;
      }
    });
  });

  root.walkAtRules('extend', (rule) => {
    rule.name = 'apply';
    rule.params = `--${rule.params.split('%')[1]}`;
  });
});

(async () => {
  const files = process.argv.slice(2);

  const transformFiles = files.map(async (filePath) => {
    const fileString = await readFileAsync(filePath);

    const lazyResult = await postcss([noSassplugin])
      .process(fileString, { from: filePath, syntax: postcssScss });

    await writeFileAsync(filePath, lazyResult.css);
  });


  await Promise.all(transformFiles);

  console.log('Finished successfully!');
  process.exit();
})();
