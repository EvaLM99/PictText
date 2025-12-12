import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './styles/variables.css';
import { BrowserRouter } from 'react-router-dom'; 
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from "./context/SocketContext";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './utils/queryClient';
import { PresenceProvider } from './context/PresenceContext';
import ErrorBoundary from './components/ErrorBoundary/errorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <QueryClientProvider client={queryClient}>
            <PresenceProvider>
              <App />
            </PresenceProvider>
          </QueryClientProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

reportWebVitals();