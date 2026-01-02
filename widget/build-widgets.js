import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build both calendar widget and PR context widget
const widgets = ['calendar-widget', 'pr-context-widget'];

async function buildWidgets() {
  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];
    console.log(`Building ${widget}...`);

    await build({
      configFile: false,
      root: __dirname,
      plugins: [
        react(),
        viteSingleFile(),
      ],
      build: {
        outDir: 'dist',
        // Only empty dist on first widget build
        emptyOutDir: i === 0,
        assetsInlineLimit: 100000000,
        cssCodeSplit: false,
        minify: 'esbuild',
        rollupOptions: {
          input: resolve(__dirname, `${widget}.html`),
          output: {
            entryFileNames: `${widget}.js`,
          },
        },
      },
      logLevel: 'warn',
    });

    console.log(`✓ ${widget} built`);
  }

  console.log('\nWidgets built successfully!');
}

buildWidgets().catch(console.error);
