#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const postcss = require('postcss');
const postcssScss = require('postcss-scss');
const { camelCase } = require('lodash');

function placeHolderToVar(str) {
  return camelCase(str.slice(1));
}

const noSassplugin = postcss.plugin('no-sass', () => (root) => {
  root.classes = new Map();
  root.usesVars = false;

  root.walkRules((rule) => {
    let selector;

    const isPlaceHolder = rule.selector[0] === '%';

    if (isPlaceHolder) {
      selector = placeHolderToVar(rule.selector);
    } else {
      // .email-share__form-group => .formGroup
      const [prefix, postfix] = rule.selector.split('__');
      selector = `${camelCase(postfix || prefix)}`;
    }

    root.classes.set(
      selector,
      {
        type: isPlaceHolder ? 'placeholder' : 'class',
        contents: '',
      },
    );

    rule.walkAtRules((atRule) => {
      if (atRule.name === 'extend') {
        root.classes.get(
          selector,
        ).contents = `${root.classes.get(selector).contents}\n  \${${placeHolderToVar(atRule.params)}};`;
      }
    });

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

      root.classes.get(
        selector,
      ).contents = `${root.classes.get(selector).contents}\n  ${decl.prop}: ${value};`;
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
    .reduce((acc, [name, { contents, type }]) => `${acc}\n${type === 'class' ? 'export ' : ''}const ${name} = styles\`${contents}\n\`;\n`, '');

  return `import { styles } from 'emotion';${root.usesVars ? '\nimport { variables } from \'@domain-group/fe-brary\';' : ''}\n${emotionExports}`;
};
