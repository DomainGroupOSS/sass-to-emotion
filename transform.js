#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const postcss = require('postcss');
const postcssScss = require('postcss-scss');
const { camelCase } = require('lodash');

const noSassplugin = postcss.plugin('no-sass', () => (root) => {
  root.classes = new Map();

  root.walkRules((rule) => {
    // .email-share__form-group => .formGroup
    const [prefix, postfix] = rule.selector.split('__');
    const selector = `${camelCase(postfix || prefix)}`;

    rule.walkDecls((decl) => {
      // console.log('decl.prop:', decl.prop);
      // // color: $fe-brary-colour-neutral-400; => color: var(--fe-brary-colour-neutral-400);
      // if (decl.value[0] === '$') {
      //   decl.value = `var(--${decl.value.slice(1)})`;
      // }

      root.classes.set(
        selector,
        `${root.classes.get(selector) || ''}
          ${decl.prop}: ${decl.value}`,
      );
    });
  });

  // root.walkAtRules('extend', (rule) => {
  //   rule.name = 'apply';
  //   rule.params = `--${rule.params.split('%')[1]}`;
  // });
});

module.exports = async (cssString, filePath) => {
  const result = await postcss([noSassplugin])
    .process(cssString, { from: filePath, syntax: postcssScss });

  const emotionExports = Array.from(result.root.classes.entries())
    .reduce((acc, [name, values]) => `${acc}\nexport const ${name} = styles\`${values}\``, '');

  return `import { styles } from 'emotion';
    ${emotionExports}
  `;
};
