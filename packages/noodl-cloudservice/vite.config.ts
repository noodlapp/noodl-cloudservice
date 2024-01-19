import { resolve } from 'path';
import { defineConfig } from 'vite';
import { externals } from 'rollup-plugin-node-externals';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'main',
      fileName: 'main',
    },
  },
  plugins: [
    // Import all dependencies as external
    {
      enforce: 'pre',
      ...externals(),
    },
    viteStaticCopy({
      structured: false,
      targets: [
        {
          src: 'static/*',
          dest: 'static'
        }
      ]
    })
  ],
});
