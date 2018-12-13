module.exports = {
  extends: 'airbnb-base',
  overrides: [
    {
      files: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
      env: {
        jest: true, // now **/*.test.js files' env has both es6 *and* jest
      },
      // Can't extend in overrides: https://github.com/eslint/eslint/issues/8813
      // "extends": ["plugin:jest/recommended"]
      plugins: ['jest'],
    },
  ],
};
