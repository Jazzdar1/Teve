import React from 'react';
import { createRoot } from 'react-dom/client';
import { VideoPlayer } from './components/VideoPlayer';

const App = () => {
  const engines = ['Auto', 'HLS.js', 'JWPlayer'];
  const [engine, setEngine] = React.useState(engines[0]);

  return (
    <div>
      <select value={engine} onChange={e => setEngine(e.target.value)}>
        {engines.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <div style={{ width: 800, height: 600 }}>
        <VideoPlayer url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
