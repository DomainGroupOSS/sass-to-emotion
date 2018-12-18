/* eslint-disable no-param-reassign, no-console */
const { basename } = require('path');
const { camelCase } = require('lodash');

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

  // rename className="foo__bar-baz" => className={styles.barBaz}
  root
    .find(j.JSXAttribute, {
      name: {
        type: 'JSXIdentifier',
        name: 'className',
      },
    })
    .forEach((path) => {
      if (path.value.value.type !== 'Literal') return;

      const selector = path.value.value.value;

      const [prefix, postfix] = selector.split('__');
      const identifier = `${camelCase(postfix || prefix)}`;

      path.value.value = j.jsxExpressionContainer(
        j.memberExpression(j.identifier(STYLES_IMPORT_NAME), j.identifier(identifier)),
      );
    });

  // import styles
  const moduleName = `../style/${basename(file.path)}`;

  const collection = root.find(j.ImportDeclaration);

  const target = collection.at(-1).get();

  const importStatement = j.importDeclaration(
    [j.importDefaultSpecifier(j.identifier(STYLES_IMPORT_NAME))],
    j.literal(moduleName),
  );

  // doing this because https://github.com/facebook/jscodeshift/issues/185
  const reactImportStatement = j.importDeclaration(
    [j.importDefaultSpecifier(j.identifier('React'))],
    j.literal('react'),
  );

  j(target).replaceWith(importStatement).insertBefore(reactImportStatement);

  return root.toSource({ quote: 'single', trailingComma: true });
};
