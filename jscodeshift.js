/* eslint-disable no-param-reassign, no-console */
const glob = require('glob');
const path = require('path');
const selectorToLiteral = require('./selector-to-variable-identifier');
// TODO make CLI option

const STYLES_IMPORT_NAME = 'styles';

module.exports = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);

  const hasReact = root
    .find(j.ImportDeclaration, {
      type: 'ImportDeclaration',
      source: {
        type: 'Literal',
        value: 'react',
      },
    })
    .size() === 1;

  if (!hasReact) return null;

  const hasAStyleImport = root
    .find(j.ImportDeclaration, {
      type: 'ImportDeclaration',
      source: {
        type: 'Literal',
      },
    })
    .filter(declarator => declarator.value.source.value.includes('style'))
    .size() > 0;

  if (hasAStyleImport) return null;

  const hasClassName = root
    .find(j.JSXAttribute, {
      name: {
        type: 'JSXIdentifier',
        name: 'className',
      },
    })
    .size() > 0;

  if (!hasClassName) return null;

  const jsEmotionFiles = glob.sync(
    path.join(file.path.split('/js/')[0], 'style', '**', '*.js'),
    { absolute: true },
  );

  let moduleName;
  // rename className="foo__bar-baz" => className={styles.barBaz}
  root
    .find(j.JSXAttribute, {
      name: {
        type: 'JSXIdentifier',
        name: 'className',
      },
    })
    .forEach((jsxPath) => {
      if (jsxPath.value.value.type !== 'Literal') return;

      const selector = jsxPath.value.value.value;

      const identifier = selectorToLiteral(selector);

      if (!moduleName) {
        const pathToEmotionFile = jsEmotionFiles.find(
          // eslint-disable-next-line import/no-dynamic-require, global-require
          jsEmotionFile => !!require(jsEmotionFile)[identifier],
        );

        if (pathToEmotionFile) {
          moduleName = path.join(
            path.relative(path.dirname(file.path), path.dirname(pathToEmotionFile)),
            path.basename(pathToEmotionFile),
          ).replace('.js', '');
        }
      }

      jsxPath.value.name = 'css';
      jsxPath.value.value = j.jsxExpressionContainer(
        j.memberExpression(j.identifier(STYLES_IMPORT_NAME), j.identifier(identifier)),
      );
    });

  const collection = root.find(j.ImportDeclaration);

  // I'd love to simply add to last import but insertAfter causing a line break after last import
  // and before new styles import so code below gets weird
  // https://github.com/facebook/jscodeshift/issues/185
  const relativeImports = collection.filter(importPath => importPath.value.source.value.startsWith('.'));

  let lastImportTarget;

  if (relativeImports.length) {
    lastImportTarget = relativeImports.get();
  } else {
    lastImportTarget = collection.at(-1).get();
  }

  const stylesImportStatement = j.importDeclaration(
    [j.importNamespaceSpecifier(j.identifier(STYLES_IMPORT_NAME))],
    j.literal(moduleName || '../../style/FIXME'),
  );

  // e.g import foo from 'foo';
  const lastImportIsSimpleModule = lastImportTarget.value.specifiers.length === 1
    && lastImportTarget.value.specifiers[0].type === 'ImportDefaultSpecifier';

  // note linter wants relative import last
  const lastImportIsRelative = lastImportTarget.value.source.value.startsWith('.');

  if (lastImportIsRelative) {
    j(lastImportTarget).insertBefore(stylesImportStatement);
  } else if (lastImportIsSimpleModule) {
    const oldImport = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(lastImportTarget.value.specifiers[0].local.name))],
      j.literal(lastImportTarget.value.source.value),
    );
    j(lastImportTarget)
      .replaceWith(stylesImportStatement)
      // even if I use old lastImportTarget.value reference instead of oldImport, issue persists.
      .insertBefore(oldImport);
  } else {
    // this will cause a line break after last import, seems FB strugled with this one too https://github.com/reactjs/react-codemod/blob/96b55a0ea70c7b1a9c64d12b47e523804bb74b22/transforms/__testfixtures__/ReactNative-View-propTypes/default-import-multi-reference.output.js#L4
    j(lastImportTarget).insertAfter(stylesImportStatement);
  }

  return root.toSource({ quote: 'single', trailingComma: true });
};
