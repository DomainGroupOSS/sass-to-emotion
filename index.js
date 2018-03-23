#!/usr/bin/env node
const postcss = require('postcss');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const { camelCase } = require('lodash');

const noSassplugin = postcss.plugin('no-sass', (options = {}) => {
  return root => {
    root.walkRules(rule => {
      // .email-share__form-group => .formGroup
      const [prefix, postfix] = rule.selector.split('__');
      rule.selector = `.${camelCase(postfix || prefix)}`;

      rule.walkDecls(decl => {
        // color: $fe-brary-colour-neutral-400; => color: var(--fe-brary-colour-neutral-400);
        if (decl.value[0] === '$') {
          decl.value = `var(--${decl.value.slice(1)})`
        }
      });
    });

    root.walkAtRules('extend', rule => {
      rule.name = 'apply';
      rule.params = `--${rule.params.split('%')[1]}`;
    });
  };
});

Promise.all(
  process.argv.slice(2).map(filePath =>
    readFileAsync(filePath).then(fileString =>
      postcss([noSassplugin])
        .process(fileString, { from: filePath })
        .then(lazyResult => writeFileAsync(filePath, lazyResult.css)),
    ),
  ),
).then(() => {
  process.exit();
});
