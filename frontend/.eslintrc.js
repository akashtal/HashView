module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'import/no-unresolved': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  globals: {
    React: 'readonly',
  },
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'build/'],
};
