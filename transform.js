#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const postcss = require('postcss');
const postcssScss = require('postcss-scss');
const { camelCase } = require('lodash');

const noSassplugin = postcss.plugin('no-sass', () => (root) => {
  root.classes = new Map();
  root.usesVars = false;

  root.walkRules((rule) => {
    // .email-share__form-group => .formGroup
    const [prefix, postfix] = rule.selector.split('__');
    const selector = `${camelCase(postfix || prefix)}`;

    rule.walkDecls((decl) => {
      let { value } = decl;
      const isASassVar = value[0] === '$';

      if (isASassVar) {
        root.usesVars = true;

        const [, name] = value.split('$fe-brary-');
        const [field, ...varNameSegs] = name.split(('-'));
        const varName = camelCase(varNameSegs.join('-'));
        value = `\${variables.${field}.${varName}}`;
      }

      root.classes.set(
        selector,
        `${root.classes.get(selector) || ''}\n  ${decl.prop}: ${value};`,
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
  const { root } = result;

  const emotionExports = Array.from(root.classes.entries())
    .reduce((acc, [name, values]) => `${acc}\nexport const ${name} = styles\`${values}\n\`;\n`, '');

  return `import { styles } from 'emotion';${root.usesVars ? '\nimport { variables } from \'@domain-group/fe-brary\';' : ''}\n${emotionExports}`;
};
