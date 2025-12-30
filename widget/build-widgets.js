import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Only build the unified calendar widget
const widgets = ['calendar-widget'];

async function buildWidgets() {
  for (const widget of widgets) {
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
        emptyOutDir: true,
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
  
  console.log('\nWidget built successfully!');
}

buildWidgets().catch(console.error);
