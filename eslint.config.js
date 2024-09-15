'use strict';

module.exports = require('eslint-config-sukka').sukka(
  {},
  {
    files: [
      'packages/userscripts/src/dummy.js'
    ],
    rules: {
      'sukka/unicorn/no-empty-file': 'off'
    }
  }
);
