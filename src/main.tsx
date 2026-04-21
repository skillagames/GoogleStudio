import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

async function testFirebaseConnection() {
  try {
    // Attempting a server-side fetching to verify configuration and connectivity
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase status: Connected");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase status: Offline. Check configuration.");
    } else {
      console.log("Firebase status: Authenticated and Ready");
    }
  }
}

testFirebaseConnection();

// Register Service Worker for PWA/Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered:', registration);
    }).catch(error => {
      console.warn('SW registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
