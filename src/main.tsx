import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Clear any fallback content
rootElement.innerHTML = '';

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);