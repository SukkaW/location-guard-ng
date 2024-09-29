'use strict';

module.exports = require('eslint-config-sukka').sukka(
  {
    react: {
      enable: true,
      files: [
        'packages/web/**/*.{js,jsx,ts,tsx}'
      ]
    }
  },
  {
    files: [
      'packages/userscripts/src/dummy.js'
    ],
    rules: {
      'sukka/unicorn/no-empty-file': 'off'
    }
  }
);
