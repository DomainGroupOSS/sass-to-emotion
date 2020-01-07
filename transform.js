#!/usr/bin/env node
/* eslint-disable no-param-reassign */
const postcssScss = require('postcss-scss');
const postcss = require('postcss');
const { camelCase } = require('lodash');
const format = require('prettier-eslint');
const path = require('path');

let feBrary;
try {
  // OSS users will not have optional package
  feBrary = require('@domain-group/fe-brary'); // eslint-disable-line
} catch (error) {
  feBrary = null;
}

const selectorToLiteral = require('./selector-to-variable-identifier');

// TODO make CLI option
const FE_BRARY_PREFIX = '$fe-brary-';

const MEDIA_HELPER = '__MEDIA_HELPER__';

const COMBINATORS = ['>', '+', '~'];

const OPERATORS = [' + ', ' - ', ' / ', ' * ', ' % ', ' < ', ' > ', ' == ', ' != ', ' <= ', ' >= '];

const processRoot = (root, filePath) => {
  const output = {
    usesFeBraryVars: false,
    feBraryHelpers: [],

    externalHelpers: [],
    externalVars: [],

    classes: new Map(),
  };

  function checkUpTree(node, checkerFunc, rule) {
    let passedCheck = false;
    let parentNode = node.parent;
    do {
      if (rule === parentNode) return passedCheck;
      if (parentNode !== root && checkerFunc(parentNode)) {
        passedCheck = true;
      }
      parentNode = parentNode.parent;
    } while (parentNode && parentNode !== root && !passedCheck);

    return passedCheck;
  }

  function handleSassVar(decl) {
    let values;

    if (decl.value.includes(',') && postcss.list.comma(decl.value)[0] !== decl.value) {
      values = postcss.list.comma(decl.value);
    } else if (decl.value.includes(' ') && postcss.list.space(decl.value)[0] !== decl.value) {
      values = postcss.list.space(decl.value);
    } else {
      values = [decl.value];
    }

    return values
      .map((string) => {
        if (string.startsWith(FE_BRARY_PREFIX)) {
          if (!output.usesFeBraryVars) {
            output.usesFeBraryVars = true;
          }

          const [, name] = string.split(FE_BRARY_PREFIX);
          const [field, ...varNameSegs] = name.split('-');
          const varName = camelCase(varNameSegs.join('-'));
          return `\${vars.${field}.${varName}}`;
        }

        if (string.startsWith('$')) {
          const varName = selectorToLiteral(string.slice(1));

          if (
            checkUpTree(
              decl,
              nodeToCheck => nodeToCheck.type === 'atrule' && nodeToCheck.name === 'mixin',
            )
            || root.nodes.some(node => node.prop === string)
          ) {
            return `\${${varName}}`;
          }

          if (!output.externalVars.includes(varName)) {
            output.externalVars.push(varName);
          }

          return `\${${varName}}`;
        }

        return string;
      })
      .join(' ');
  }

  function handleSassVarUnescaped(value) {
    if (value.startsWith(FE_BRARY_PREFIX)) {
      const [, name] = value.split(FE_BRARY_PREFIX);
      const [field, ...varNameSegs] = name.split('-');
      const varName = camelCase(varNameSegs.join('-'));
      if (!output.usesFeBraryVars) {
        output.usesFeBraryVars = true;
      }
      return `vars.${field}.${varName}`;
    }

    if (value.startsWith('$')) {
      const varName = selectorToLiteral(value.slice(1));

      if (!root.nodes.some(node => node.prop === value)
      && !output.externalVars.includes(varName)) {
        output.externalVars.push(varName);
      }

      return `${varName}`;
    }

    const isWrappedInQuotes = ['"', "'"].includes(value[0]);
    if (isWrappedInQuotes) {
      return value;
    }

    // wrap in string quotes, e.g 100px => '100px'
    return `'${value}'`;
  }

  function placeHolderToVarRef(params) {
    return `\${${selectorToLiteral(params)}};`;
  }

  function mixinParamsToFunc(str) {
    if (!str.includes('(')) {
      return `${selectorToLiteral(str.trim())}()`;
    }

    const [funcName, inputs] = str.split('(');
    return `${selectorToLiteral(funcName)}(${inputs.replace(/\$/g, '')}`;
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }


  // WALKING TIME

  // maybe use /S
  root.walkRules(/ \./, (rule) => {
    if (rule.selector.includes(',')) return;
    if (COMBINATORS.some(combinator => rule.selector.includes(combinator))) return;

    const rules = rule.selector.split(' ');
    const last = rules[rules.length - 1];

    const { nodes } = rule;

    const newRule = postcss.rule({ selector: last });
    newRule.append(nodes);
    root.append(rule, newRule);
    rule.remove();
  });

  root.walkAtRules('media', (atRule) => {
    let query;
    switch (atRule.params) {
      // left out mobile because include-media $breakpoints uses 320px hardcoded for mobile,
      // not sure why this was done.
      case '(min-width: $fe-brary-global-tablet-min-width)':
      case '(min-width: $tablet-min-width)':
        query = '>=tablet';
        break;
      case '(min-width: $fe-brary-global-desktop-min-width)':
      case '(min-width: $desktop-min-width)':
        query = '>=desktop';
        break;
      case '(min-width: $fe-brary-global-lrg-desktop-min-width)':
      case '(min-width: $lrg-desktop-min-width)':
        query = '>=lrg-desktop';
        break;
      case '(max-width: $fe-brary-global-tablet-min-width)':
      case '(max-width: $tablet-min-width)':
        query = '<=tablet';
        break;
      case '(max-width: $fe-brary-global-desktop-min-width)':
      case '(max-width: $desktop-min-width)':
        query = '<=desktop';
        break;
      case '(max-width: $fe-brary-global-lrg-desktop-min-width)':
      case '(max-width: $lrg-desktop-min-width)':
        query = '<=lrg-desktop';
        break;
      default:
    }

    if (query) {
      atRule.params = `\${media('${query}')}`;
      atRule.name = MEDIA_HELPER;
      return;
    }

    let newParams;
    (atRule.params.match(/\$[A-Za-z-]+/g) || []).forEach((sassVar) => {
      newParams = atRule.params.replace(sassVar, `\${${handleSassVarUnescaped(sassVar)}}`);
    });
    if (newParams) {
      atRule.params = newParams;
    }
  });

  // move nested var declarations to top
  root.walkDecls(/^\$/, (decl) => {
    if (decl.parent !== root) {
      root.prepend(decl.remove());
    }
  });

  root.walkComments((comment) => {
    if (comment.text.includes('scss-lint')) {
      comment.remove();
    }

    if (comment.parent === root) {
      output.classes.set(
        `comment:${comment.source.start.line}`, {
          node: comment,
          type: 'jsComment',
        },
      );
    }
  });

  // e.g .foo.bar
  root.walkRules(/^\.[a-zA-Z0-9_-]+\./, (rule) => {
    const classes = rule.selector.split('.').filter(Boolean);

    // need to pick a winning class, going to arbitrarily pick the last
    rule.selector = `.${classes[classes.length - 1]}`;
  });

  // duplicate comma rules e.g .foo,.bar { color: pink }
  root.walkRules(/,/, (rule) => {
    if (rule.selector.includes('&')) return;

    const classes = postcss.list.comma(rule.selector);

    if (!classes.every(classStr => classStr.startsWith('.') && !classStr.includes(' '))) return;

    const sharedPlaceholder = classes
      .map(selectorToLiteral)
      .map((str, index) => {
        if (index === 0) return str;

        return capitalizeFirstLetter(str);
      })
      .join('');

    const newSelector = `%${sharedPlaceholder}`;

    rule.selector = newSelector;

    rule.remove();

    root.prepend(rule);

    classes.forEach((selector, index) => {
      const placeHolderAtRule = postcss.atRule({ name: 'extend', params: newSelector });

      let foundTheTopLevelClass = false;
      root.walkRules(selector, (ruleToFind) => {
        if (ruleToFind.parent === root) {
          foundTheTopLevelClass = true;
          ruleToFind.prepend(placeHolderAtRule);
        }
      });

      if (!foundTheTopLevelClass) {
        const ruleWithPlaceholder = postcss.rule({ selector });
        ruleWithPlaceholder.append(placeHolderAtRule);
        ruleWithPlaceholder.source = {};
        ruleWithPlaceholder.source.start = {};
        ruleWithPlaceholder.source.start.line = rule.source.start.line + (index / 1000);
        root.append(ruleWithPlaceholder);
      }
    });
  });

  // move all three below to global scope and use stringify
  root.walkAtRules('extend', (atRule) => {
    atRule.originalParams = atRule.params;
    let hasRefInFile;
    root.walkRules(atRule.params, () => {
      hasRefInFile = true;
    });

    const ref = selectorToLiteral(atRule.params);

    if (!hasRefInFile) {
      // use fe-brary export to check and improve once done
      if (feBrary && feBrary[ref] && typeof feBrary[ref] === 'object') {
        if (!output.feBraryHelpers.includes(ref)) output.feBraryHelpers.push(ref);
      } else if (!output.externalHelpers.includes(ref)) output.externalHelpers.push(ref);
    }

    atRule.params = placeHolderToVarRef(atRule.params);
  });

  root.walkAtRules('include', (atRule) => {
    atRule.originalParams = atRule.params;
    const [funcName, inputs] = atRule.params.split('(');
    const literalFuncName = selectorToLiteral(funcName);
    // check for https://github.com/eduardoboucas/include-media
    if (atRule.nodes && atRule.nodes.length && atRule.params.trim().startsWith('media(')) {
      atRule.name = MEDIA_HELPER;
      atRule.params = `\${${atRule.params.trim()}}`;
      return;
    }

    let hasRefInFile;
    root.walkAtRules('mixin', (mixinDeclRule) => {
      const [mixinFuncName] = mixinDeclRule.params.split('(');
      if (mixinFuncName === funcName) hasRefInFile = true;
    });

    if (!hasRefInFile) {
      if (feBrary[literalFuncName] && typeof feBrary[literalFuncName] === 'function') {
        if (!output.feBraryHelpers.includes(literalFuncName)) {
          output.feBraryHelpers.push(literalFuncName);
        }
      } else if (!output.externalHelpers.includes(literalFuncName)) {
        output.externalHelpers.push(literalFuncName);
      }
    }

    if (!atRule.params.includes('(')) {
      atRule.params = `\${${selectorToLiteral(atRule.params.trim())}()}`;
      return;
    }

    const inputsWithoutBraces = inputs.slice(0, -1);
    const args = inputsWithoutBraces.split(',').map(arg => handleSassVarUnescaped(arg.trim()));

    atRule.params = `\${${selectorToLiteral(funcName.trim())} (${args.join(', ')})}`;
  });

  root.walkDecls((decl) => {
    if (decl.parent && decl.parent === root) {
      let isUsedInFile = false;
      // search all decl values for ref
      root.walkDecls((declSearch) => {
        if (declSearch === decl) return;
        if (
          declSearch.value
          && declSearch.value.includes(decl.prop)
          && declSearch.parent !== root
        ) {
          isUsedInFile = true;
        }
      });

      if (decl.value.includes(FE_BRARY_PREFIX)) output.usesFeBraryVars = true;

      decl.value = handleSassVar(decl);

      output.classes.set(decl.prop, {
        type: 'constVar',
        node: decl,
        isUsedInFile,
      });
      return;
    }

    if (OPERATORS.some(operator => decl.value.includes(operator))) {
      global.sassToEmotionWarnings[filePath] = global.sassToEmotionWarnings[filePath] || [];
      const msg = "Sass maths detected, find the FIXME's in this file and manually fix.";
      if (!global.sassToEmotionWarnings[filePath].includes(msg)) {
        global.sassToEmotionWarnings[filePath].push(msg);
      }
      decl.parent.insertBefore(
        decl,
        postcss.comment({
          text: `FIXME: Sass maths was detected in the line below, you must fix manually.\n Original was '${
            decl.value
          }'`,
        }),
      );
    }

    decl.value = handleSassVar(decl);
  });

  root.walkRules(/^(?!(\.|%|:))/, (rule) => {
    if (rule.parent !== root) return;
    const msg = `Found a global selector "${
      rule.selector
    }". Do you need this? If you must use "import { Global } from '@emotion/core'".`;
    if (global.sassToEmotionWarnings[filePath]) {
      global.sassToEmotionWarnings[filePath].push(msg);
    } else {
      global.sassToEmotionWarnings[filePath] = [msg];
    }
  });

  root.walkRules(/^&[a-zA-Z0-9_-]/, (rule) => {
    if (rule.parent === root || !rule.parent.selector.startsWith('.')) return;

    rule.selector = `${rule.parent.selector}${rule.selector.slice(1)}`;
  });

  // flattens nested rules
  root.walkRules(/^(\.|%)/, (rule) => {
    let { selector } = rule;
    let pseudoPostfix;

    if (rule.selector.includes(':')) {
      [selector, pseudoPostfix] = rule.selector.split(':');
    }

    const isPlaceHolder = rule.selector[0] === '%';

    let isUsedInFile = false;
    if (isPlaceHolder) {
      selector = selectorToLiteral(selector);
      // search to see if placeholder is used
      root.walkAtRules('extend', (atRule) => {
        // note atRule.params has already been modified
        if (atRule.originalParams === rule.selector) {
          isUsedInFile = true;
        }
      });
    } else {
      selector = selectorToLiteral(selector);
    }

    if (
      checkUpTree(
        rule,
        nodeToCheck => nodeToCheck.type === 'atrule' && nodeToCheck.name === 'mixin',
      )
    ) return;

    if (rule.contentsAlreadyPrinted) {
      return;
    }

    let contents = '';

    postcssScss.stringify(rule, (string, node, startOrEnd) => {
      if (node && node === rule && startOrEnd) return;

      // asumption here is that there is some state involved
      // e.g &:hover or &.is-selected.
      const nestedInAmpersand = node
        && checkUpTree(
          node,
          nodeToCheck => nodeToCheck.type === 'rule' && nodeToCheck.selector.startsWith('&'),
        );

      if (node && isPlaceHolder) {
        node.contentsAlreadyPrinted = true;
      }

      // ref class if nested in ampersand
      if (
        node
        && node.type === 'rule'
        && startOrEnd === 'start'
        && !node.selector.startsWith('&')
        && nestedInAmpersand
      ) {
        node.contentsAlreadyPrinted = true;

        global.sassToEmotionWarnings[filePath] = global.sassToEmotionWarnings[filePath] || [];
        const msg = `Class "${node.selector}" referenced twice, and once inside a \`&.\`.`;
        if (!global.sassToEmotionWarnings[filePath].includes(msg)) {
          global.sassToEmotionWarnings[filePath].push(msg);
        }

        contents += '// FIXME: Sass class referenced inside a &. block, manual fix required.\n';
        contents += string;
        return;
      }

      // ignore nested classes
      if (
        node
        && node.type === 'rule'
        && node.selector.startsWith('.')
        && !nestedInAmpersand
        && !isPlaceHolder
      ) {
        node.isItsOwnCssVar = true;
        return;
      }

      // don't print anything that's in it's own css var
      if (
        node
        && checkUpTree(
          node,
          // nodeToCheck !== rule means not the rule being printed
          nodeToCheck => nodeToCheck.type === 'rule' && nodeToCheck.isItsOwnCssVar && nodeToCheck !== rule,
          rule,
        )
      ) {
        return;
      }

      if (
        node
        && node.type === 'atrule'
        // this is to omit the @media part
        && node.name === MEDIA_HELPER
        && startOrEnd === 'start'
      ) {
        contents += `${node.params} {`;
        if (!output.feBraryHelpers.includes('media')) output.feBraryHelpers.push('media');
        return;
      }

      // handle mixins and placeholder's
      if (node && ['extend', 'include'].includes(node.name)) {
        contents += node.params;
        return;
      }

      contents += string;
    });

    if (contents.trim() === '') return;

    let newContents = pseudoPostfix ? `&:${pseudoPostfix} { ${contents} }` : contents;

    newContents = output.classes.has(selector)
      ? output.classes.get(selector).contents + newContents
      : newContents;

    output.classes.set(selector, {
      type: isPlaceHolder ? 'placeholder' : 'class',
      isUsedInFile,
      contents: newContents,
      node: rule,
    });
  });

  root.walkAtRules('mixin', (atRule) => {
    const { params } = atRule;
    const selector = mixinParamsToFunc(params);

    let contents = '';
    postcssScss.stringify(atRule, (string, node, startOrEnd) => {
      // if node.type === decl skip when doing this above
      // stops first and last part entering the string e.g "@mixin ad-exact($width, $height) {"
      if (node && node === atRule && startOrEnd) return;

      contents += string;
    });

    let isUsedInFile = false;
    // search to see if mixin is used in file
    root.walkAtRules('include', (rule) => {
      if (rule.originalParams.split('(')[0] === params.split('(')[0]) {
        isUsedInFile = true;
      }
    });

    output.classes.set(selector, {
      type: 'mixin',
      contents,
      isUsedInFile,
      node: atRule,
    });
  });

  return output;
};

module.exports = (cssString, filePath, pathToVariables = '../variables') => {
  const root = postcssScss.parse(cssString, { from: filePath });

  const output = processRoot(root, filePath);

  // e.g styles.scss
  const isJustSassImports = root.nodes.every(
    node => node.type === 'atrule' && node.name === 'import',
  );
  if (isJustSassImports) return null;

  let fileIsJustVarExports = true;

  const classesEntries = Array.from(output.classes.entries());

  const oneDefault = classesEntries.filter(([, { isUsedInFile }]) => !isUsedInFile).length === 1;

  const emotionExports = classesEntries
    .sort(([, { node: a, type: aType }], [, { node: b, type: bType }]) => {
      if (aType === 'constVar') {
        return -1;
      }

      if (bType === 'constVar') {
        return 1;
      }

      if (!a.source || !b.source) return 0;

      return a.source.start.line - b.source.start.line;
    })
    .reduce((acc, [name, {
      contents, type, node, isUsedInFile,
    }], currentIndex, sourceArray) => {
      if (type !== 'constVar') {
        fileIsJustVarExports = false;
      }

      if (type === 'jsComment') {
        if (node.text.includes('\n') || node.text.includes('\r')) {
          return `${acc}/*\n${node.text}\n*/`;
        }
        return `${acc}\n// ${node.text}`;
      }

      if (type === 'mixin') {
        return `${acc}\n${isUsedInFile ? '' : 'export '}${
          oneDefault && !isUsedInFile ? ' default ' : ''
        }function ${name} {\n  return css\`${contents}\n  \`;\n}\n`;
      }

      if (type === 'constVar') {
        let val;

        if (node.value.includes('$')) {
          // eslint-disable-line
          val = `\`${node.value.replace('$', '$')}\``; // eslint-disable-line
        } else if (node.value.includes("'")) {
          val = `"${node.value.replace('\n', ' ')}"`;
        } else {
          val = `'${node.value.replace('\n', ' ')}'`;
        }
        return `${acc}\n${isUsedInFile ? '' : 'export '}${
          oneDefault && !isUsedInFile ? ' default ' : ` const ${selectorToLiteral(node.prop)} = `
        } ${val}${
          sourceArray[currentIndex + 1] && sourceArray[currentIndex + 1][1].type !== 'constVar'
            ? '\n'
            : ''
        }`;
      }

      return `${acc}\n${type === 'class' || !isUsedInFile ? 'export ' : ''}${
        oneDefault && !isUsedInFile ? 'default ' : `const ${name} = `
      }css\`${contents}\`;\n`;
    }, '');

  const js = `${fileIsJustVarExports ? '' : "import { css } from '@emotion/core'"};\n${
    output.usesFeBraryVars
      ? `import { variables as vars${
        output.feBraryHelpers.length ? `, ${output.feBraryHelpers.join(', ')}` : ''
      } } from '@domain-group/fe-brary';\n`
      : ''
  }${
    !output.usesFeBraryVars && output.feBraryHelpers.length
      ? `import { ${output.feBraryHelpers.join(', ')} } from '@domain-group/fe-brary';\n`
      : ''
  }${
    output.externalHelpers.length
      ? `import { ${output.externalHelpers.join(', ')} } from '../utils';\n`
      : ''
  }${
    output.externalVars.length
      ? `import { ${output.externalVars.join(', ')} } from '${pathToVariables}';\n`
      : ''
  }${emotionExports}
`;

  return format({
    text: js,
    filePath: path.resolve(filePath),
    prettierOptions: { parser: 'babylon' },
  });
};
