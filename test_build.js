import { build } from 'vite';
import path from 'path';

async function test() {
  await build({
    root: process.cwd(),
    build: {
      lib: {
        entry: path.resolve(process.cwd(), 'src/components/VideoPlayer.tsx'),
        name: 'VideoPlayer',
        fileName: 'video-player'
      },
      rollupOptions: {
        external: ['react', 'react-dom']
      }
    }
  });
}

test();
