'use strict';

module.exports = require('eslint-config-sukka').sukka({}, {
  files: ['src/dummy.js'],
  rules: {
    'sukka/unicorn/no-empty-file': 'off'
  }
});
