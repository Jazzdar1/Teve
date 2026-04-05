import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Disable console output to prevent leaking stream URLs and hide internal player errors
if (typeof window !== 'undefined') {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;

  // Prevent "Uncaught (in promise) DOMException: The play() request was interrupted" errors globally
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    const promise = originalPlay.apply(this, arguments as any);
    if (promise !== undefined) {
      promise.catch(error => {
        // Ignore the "interrupted by a new load request" error
      });
    }
    return promise as any;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
