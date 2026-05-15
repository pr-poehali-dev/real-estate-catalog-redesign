import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <SettingsProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </SettingsProvider>
);