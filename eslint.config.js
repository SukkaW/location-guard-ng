'use strict';

module.exports = require('eslint-config-sukka').sukka({
  ts: {
    // TODO: use projectService with multiplt tsconfig.json
    tsconfigPath: [
      'tsconfig.json',
      'tsconfig.rollup.config.json'
    ]
  }
}, {
  files: ['src/dummy.js'],
  rules: {
    'sukka/unicorn/no-empty-file': 'off'
  }
});
