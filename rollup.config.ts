import { swc, defineRollupSwcOption } from 'rollup-plugin-swc3';
import metablock from 'rollup-plugin-userscript-metablock';
import pkgJson from './package.json';
import { defineConfig } from 'rollup';

const userScriptMetaBlockConfig = {
  file: './userscript.meta.json',
  override: {
    version: pkgJson.version,
    description: pkgJson.description,
    author: pkgJson.author
  }
};

export default defineConfig([
  {
    input: 'src/index.ts',
    output: [{
      format: 'iife',
      file: 'dist/bring-github-old-feed-back.user.js',
      sourcemap: false,
      esModule: false,
      compact: true,
      generatedCode: 'es2015'
    }],
    plugins: [
      swc(defineRollupSwcOption({
        jsc: {
          target: 'es2020',
          externalHelpers: true
        }
      })),
      metablock(userScriptMetaBlockConfig)
    ],
    external: ['typed-query-selector']
  },
  {
    input: 'src/dummy.js',
    output: [{
      file: 'dist/bring-github-old-feed-back.meta.js'
    }],
    plugins: [
      metablock(userScriptMetaBlockConfig)
    ]
  }
]);
