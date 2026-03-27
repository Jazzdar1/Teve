import { createServer } from 'vite';

async function test() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const mod = await vite.ssrLoadModule('/src/components/VideoPlayer.tsx');
    console.log('VideoPlayer module loaded successfully');
  } catch (e) {
    console.error('Error loading VideoPlayer:', e);
  }

  await vite.close();
}

test();
