import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-luxury.css';
import './benefy-blue-theme.css';
import './benefy-typography.css';
import './benefy-header-v4.css';
import { enableCompactHeader } from './compactHeader';
import { enableProfilePopover } from './profileEnhancer';

function Root() {
  useEffect(() => {
    const disableCompactHeader = enableCompactHeader();
    const disableProfilePopover = enableProfilePopover();
    return () => {
      disableCompactHeader?.();
      disableProfilePopover?.();
    };
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
