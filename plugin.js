/* eslint-disable func-names, no-param-reassign */
const { camelCase } = require('lodash');
const path = require('path');

module.exports = function ({ types: t }) {
  return {
    visitor: {
      JSXAttribute({ node }) {
        if (node.value.type === 'StringLiteral' && node.name.name === 'className') {
          if (!node.value.value.includes(' ')) {
            const [prefix, postfix] = node.value.value.split('__');
            const selector = `${camelCase(postfix || prefix)}`;

            node.value = t.JSXExpressionContainer(
              t.memberExpression(t.identifier('styles'), t.identifier(selector)),
            );
          }
        }
      },

      Program({ node: { body } }) {
        const hasReact = body.some(
          ({ type, source }) => type === 'ImportDeclaration' && source.value === 'react',
        );

        if (!hasReact) return;

        const hasAStyleImport = body.some(
          ({ type, source }) => type === 'ImportDeclaration' && source.value.includes('style'),
        );

        if (hasAStyleImport) return;

        const lastImport = body
          .slice()
          .reverse()
          .findIndex(({ type }) => type === 'ImportDeclaration');

        const importStr = t.StringLiteral(`../style/${path.basename(this.filename)}`);

        body.splice(
          body.length - lastImport,
          0,
          t.ImportDeclaration([t.ImportNamespaceSpecifier(t.identifier('styles'))], importStr),
        );
      },
    },
  };
};
