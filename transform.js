#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const postcss = require('postcss');
const postcssScss = require('postcss-scss');
const { camelCase } = require('lodash');

function placeHolderToVar(str) {
  return camelCase(str.slice(1));
}

function mixinParamsToFunc(str) {
  const [funcName, inputs] = str.split('(');
  return `${camelCase(funcName)}(${inputs.replace(/\$/g, '')}`;
}

const noSassplugin = postcss.plugin('no-sass', () => (root) => {
  root.classes = new Map();
  root.usesVars = false;

  root.walkAtRules((atRule) => {
    if (atRule.name === 'mixin') {
      const { params } = atRule;
      const selector = mixinParamsToFunc(params);

      root.classes.set(
        selector,
        {
          type: 'mixin',
          contents: '',
        },
      );

      atRule.walkDecls((decl) => {
        let { value } = decl;
        const isAFeBrarySassVar = value.startsWith('$fe-brary-');

        // TODO dry
        if (isAFeBrarySassVar) {
          root.usesVars = true;
          console.log('value:', value);
          const [, name] = value.split('$fe-brary-');
          const [field, ...varNameSegs] = name.split(('-'));
          const varName = camelCase(varNameSegs.join('-'));
          value = `\${variables.${field}.${varName}}`;
        }

        root.classes.get(
          selector,
        ).contents = `${root.classes.get(selector).contents}\n    ${decl.prop}: \${${value.slice(1)}};`;
      });
    }
  });

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
      } else if (atRule.name === 'include') {
        const [funcName, inputs] = atRule.params.split('(');
        const funcCall = `${camelCase(funcName)}('${inputs.slice(0, -1).split(', ').join("', '")}')`;
        root.classes.get(
          selector,
        ).contents = `${root.classes.get(selector).contents}\n  \${${funcCall}};`;
      }
    });

    rule.walkDecls((decl) => {
      let { value } = decl;
      const isAFeBrarySassVar = value.startsWith('$fe-brary-');

      // TODO dry
      if (isAFeBrarySassVar) {
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
    .reduce((acc, [name, { contents, type }]) => {
      if (type === 'mixin') {
        return `${acc}\nfunction ${name} {\n  return styles\`${contents}\n  \`;\n}\n`;
      }

      return `${acc}\n${type === 'class' ? 'export ' : ''}const ${name} = styles\`${contents}\n\`;\n`;
    }, '');

  return `import { styles } from 'emotion';${root.usesVars ? '\nimport { variables } from \'@domain-group/fe-brary\';' : ''}\n${emotionExports}`;
};
