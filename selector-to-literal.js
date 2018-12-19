const { camelCase } = require('lodash');

// email-share__form-group => formGroup
module.exports = (selector) => {
  const [prefix, postfix] = selector.split('__');
  return `${camelCase(postfix || prefix)}`;
};
