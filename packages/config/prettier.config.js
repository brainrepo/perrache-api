module.exports = {
  // Standard.js-like formatting
  semi: false,
  singleQuote: true,
  trailingComma: 'none',

  // Spacing
  tabWidth: 2,
  useTabs: false,

  // Line length
  printWidth: 100,

  // Other formatting
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',

  // File-specific overrides
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.json',
      options: {
        printWidth: 80
      }
    }
  ]
}
