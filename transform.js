#!/usr/bin/env node
/* eslint-disable no-param-reassign, no-console */
const postcss = require('postcss-scss');
const { camelCase } = require('lodash');
const format = require('prettier-eslint');
const selectorToLiteral = require('./selector-to-literal');

// TODO make CLI option
const FE_BRARY_PREFIX = '$fe-brary-';

function placeHolderToVar(str) {
  return camelCase(str.slice(1));
}

function mixinParamsToFunc(str) {
  const [funcName, inputs] = str.split('(');
  return `${camelCase(funcName)}(${inputs.replace(/\$/g, '')}`;
}

function handleSassVar(value, root) {
  if (value.startsWith(FE_BRARY_PREFIX)) {
    root.usesVars = true;

    const [, name] = value.split(FE_BRARY_PREFIX);
    const [field, ...varNameSegs] = name.split('-');
    const varName = camelCase(varNameSegs.join('-'));
    return `\${vars.${field}.${varName}}`;
  }

  if (value.startsWith('$')) {
    return `\${${value.slice(1)}}`;
  }

  return value;
}

const processRoot = (root) => {
  root.classes = new Map();
  root.usesVars = false;

  // move all three below to global scope and use stringify
  root.walkAtRules('extend', (atRule) => {
    atRule.params = `\${${placeHolderToVar(atRule.params)}};`;
  });

  root.walkAtRules('include', (atRule) => {
    if (atRule.nodes && atRule.nodes.length && !atRule.params.startsWith('media(')) throw Error();

    const [funcName, inputs] = atRule.params.split('(');
    const funcCall = `${camelCase(funcName)}('${inputs
      .slice(0, -1)
      .split(', ')
      .join("', '")}')`;
    atRule.params = `\${${funcCall}};`;
  });

  root.walkDecls((decl) => {
    decl.value = handleSassVar(decl.value, root);
  });

  // flattens nested rules
  root.walkRules(/^\./, (rule) => {
    let selector;

    const isPlaceHolder = rule.selector[0] === '%';

    if (isPlaceHolder) {
      selector = placeHolderToVar(rule.selector);
    } else {
      selector = selectorToLiteral(rule.selector);
    }

    let nestedInMixin = false;
    let parentNode = rule.parent;
    do {
      if (parentNode !== root && parentNode.type === 'atrule' && parentNode.name === 'mixin') {
        nestedInMixin = true;
      }
      parentNode = parentNode.parent;
    } while (parentNode && parentNode !== root && !nestedInMixin);

    if (nestedInMixin) return;


    let contents = '';
    postcss.stringify(rule, (string, node, startOrEnd) => {
      if (node && node === rule && startOrEnd) return;

      // ignore nested classes
      if (node && node.type === 'rule' && node.selector.startsWith('.')) return;
      if (
        node
        && node.type === 'decl'
        && node.parent !== rule
        && node.parent.type === 'rule'
        && node.parent.selector.startsWith('.')
      ) return;

      if (node && ['extend', 'include'].includes(node.name)) {
        contents += `${node.params}\n`;
        return;
      }

      contents += string;
    });

    root.classes.set(selector, {
      type: isPlaceHolder ? 'placeholder' : 'class',
      contents,
      node: rule,
    });
  });

  root.walkAtRules('mixin', (atRule) => {
    const { params } = atRule;
    const selector = mixinParamsToFunc(params);

    let contents = '';
    postcss.stringify(atRule, (string, node, startOrEnd) => {
      // if node.type === decl skip when doing this above
      // stops first and last part entering the string e.g "@mixin ad-exact($width, $height) {"
      if (node && node === atRule && startOrEnd) return;

      contents += string;
    });

    root.classes.set(selector, {
      type: 'mixin',
      contents,
      node: atRule,
    });
  });
};

module.exports = (cssString, filePath) => {
  const root = postcss.parse(cssString, { from: filePath });

  processRoot(root);

  const emotionExports = Array.from(root.classes.entries())
    .sort(([, { node: a }], [, { node: b }]) => a.source.start.line - b.source.start.line)
    .reduce((acc, [name, { contents, type }]) => {
      if (type === 'mixin') {
        return `${acc}\nfunction ${name} {\n  return css\`${contents}\n  \`;\n}\n`;
      }

      return `${acc}\n${type === 'class' ? 'export ' : ''}const ${name} = css\`${contents}\n\`;\n`;
    }, '');

  const js = `import { css } from 'emotion';${
    root.usesVars ? "\nimport { variables as vars } from '@domain-group/fe-brary';" : ''
  }\n${emotionExports}`;

  return format({ text: js, filePath, prettierOptions: { parser: 'babylon' } });
};
