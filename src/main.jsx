import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-luxury.css';
import './benefy-blue-theme.css';
import './benefy-typography.css';
import './benefy-header-v5.css';
import './benefy-search-dark.css';
import './benefy-auth-showcase-v9.css';
import './benefy-nav-features.css';
import { enableCompactHeader } from './compactHeader';
import { enableProfilePopover } from './profileEnhancer';
import { enableAuthShowcase } from './authShowcase';
import { enableAuthControls } from './authControls';
import { enableNavFeatures } from './navFeatures';

function Root() {
  useEffect(() => {
    const disableCompactHeader = enableCompactHeader();
    const disableProfilePopover = enableProfilePopover();
    const disableAuthShowcase = enableAuthShowcase();
    const disableAuthControls = enableAuthControls();
    const disableNavFeatures = enableNavFeatures();
    return () => {
      disableCompactHeader?.();
      disableProfilePopover?.();
      disableAuthShowcase?.();
      disableAuthControls?.();
      disableNavFeatures?.();
    };
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
