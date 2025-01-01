module.exports = {
  env: {
    node: true,
    es2020: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error'
  }
};